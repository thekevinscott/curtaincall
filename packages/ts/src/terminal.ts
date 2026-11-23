/** Terminal session management with PTY and VT100 emulation. */

import unicode11 from "@xterm/addon-unicode11";
import xtermHeadless, {
  type IBufferCell,
  type IBufferLine,
  type IDisposable,
  type Terminal as XtermTerminal,
} from "@xterm/headless";
import { type IPty, spawn } from "node-pty";
import { quote, split } from "shlex";
import * as ansi from "./ansi.js";
import { Locator, type LocatorOptions } from "./locator.js";
import { renderSnapshot } from "./snapshot.js";
import { rstrip } from "./text.js";
import { type CellStyle, type CursorPosition, TimeoutError } from "./types.js";

const { Terminal: Xterm } = xtermHeadless;
const { Unicode11Addon } = unicode11;

export interface TerminalOptions {
  rows?: number;
  cols?: number;
  env?: Record<string, string>;
  history?: number;
  suppressStderr?: boolean;
}

export interface WaitOptions {
  /** Milliseconds. */
  timeout?: number;
}

export interface Size {
  rows: number;
  cols: number;
}

/** @internal */
export interface Char extends CellStyle {
  readonly data: string;
}

const ANSI_COLORS = [
  "black",
  "red",
  "green",
  "brown",
  "blue",
  "magenta",
  "cyan",
  "white",
];
const CUBE = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
const TERMINATE_SIGNALS = ["SIGHUP", "SIGCONT", "SIGINT", "SIGKILL"];
const DELAY_AFTER_TERMINATE = 100;
// node-pty holds the exit event until the PTY closes, which a grandchild can delay.
const REAP_TIMEOUT = 2000;

function hex(r: number, g: number, b: number): string {
  return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Names follow pyte so colour assertions read the same in both ports.
function colorName(
  isDefault: boolean,
  isPalette: boolean,
  color: number,
): string {
  if (isDefault) {
    return "default";
  }
  if (!isPalette) {
    return color.toString(16).padStart(6, "0");
  }
  if (color < 8) {
    return ANSI_COLORS[color] as string;
  }
  if (color < 16) {
    return `bright${ANSI_COLORS[color - 8]}`;
  }
  if (color < 232) {
    const i = color - 16;
    return hex(
      CUBE[Math.floor(i / 36) % 6] as number,
      CUBE[Math.floor(i / 6) % 6] as number,
      CUBE[i % 6] as number,
    );
  }
  const v = 8 + (color - 232) * 10;
  return hex(v, v, v);
}

// pyte stores a base character and its combining marks composed (NFC).
function cellText(cell: IBufferCell | undefined): string {
  const chars = cell?.getChars() || " ";
  return chars.length > 1 ? chars.normalize("NFC") : chars;
}

/**
 * A terminal session backed by a real PTY and VT100 emulator.
 *
 * Spawns the given command in a pseudo-terminal and feeds its output
 * through a headless xterm for accurate screen state.
 *
 * The emulator keeps a scrollback buffer so that content scrolled off the
 * visible viewport is still searchable by locators.
 */
export class Terminal {
  /** @internal */
  readonly _command: string;
  /** @internal */
  _rows: number;
  /** @internal */
  _cols: number;
  /** @internal */
  readonly _env: Record<string, string> | null;
  /** @internal */
  readonly _screen: XtermTerminal;
  /** @internal */
  _child: IPty | null = null;
  /** @internal */
  _running = false;

  private _reader: IDisposable | null = null;
  private _parsed: Promise<void> = Promise.resolve();
  private _exited: Promise<void> = Promise.resolve();
  private _exit: { exitCode: number; signal?: number } | null = null;

  constructor(
    command: string,
    {
      rows = 30,
      cols = 80,
      env,
      history = 1000,
      suppressStderr = false,
    }: TerminalOptions = {},
  ) {
    this._command = suppressStderr
      ? `bash -c ${quote(`${command} 2>/dev/null`)}`
      : command;
    this._rows = rows;
    this._cols = cols;
    this._env = env ?? null;
    this._screen = new Xterm({
      rows,
      cols,
      scrollback: history,
      allowProposedApi: true,
    });
    // xterm's default width table predates emoji; pyte counts them as two cells.
    this._screen.loadAddon(new Unicode11Addon());
    this._screen.unicode.activeVersion = "11";
  }

  /** Spawn the child process and start reading its output. */
  start(): void {
    const [file, ...args] = split(this._command);
    if (file === undefined) {
      throw new Error("Cannot start a Terminal with an empty command");
    }

    const child = spawn(file, args, {
      rows: this._rows,
      cols: this._cols,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLUMNS: String(this._cols),
        LINES: String(this._rows),
        ...this._env,
      },
    });
    this._child = child;
    this._running = true;
    this._reader = child.onData((data) => {
      void this._feed(data);
    });
    this._exited = new Promise((resolve) => {
      child.onExit((exit) => {
        this._exit = exit;
        resolve();
      });
    });
  }

  /**
   * Feed output to the emulator. Resolves once it is reflected in the buffer.
   * @internal
   */
  _feed(data: string | Uint8Array): Promise<void> {
    const parsed = new Promise<void>((resolve) => {
      this._screen.write(data, resolve);
    });
    this._parsed = parsed;
    return parsed;
  }

  private _requireChild(): IPty {
    if (this._child === null) {
      throw new Error("Terminal has not been started");
    }
    return this._child;
  }

  private async _exitedWithin(timeout: number): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timedOut = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeout);
    });
    try {
      return await Promise.race([this._exited.then(() => true), timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Send raw text to the PTY. */
  write(text: string): void {
    this._requireChild().write(text);
  }

  /** Send text followed by Enter. */
  submit(text: string): void {
    this.write(text + ansi.ENTER);
  }

  keyUp(): void {
    this.write(ansi.UP);
  }

  keyDown(): void {
    this.write(ansi.DOWN);
  }

  keyLeft(): void {
    this.write(ansi.LEFT);
  }

  keyRight(): void {
    this.write(ansi.RIGHT);
  }

  keyEnter(): void {
    this.write(ansi.ENTER);
  }

  keyBackspace(): void {
    this.write(ansi.BACKSPACE);
  }

  keyDelete(): void {
    this.write(ansi.DELETE);
  }

  keyTab(): void {
    this.write(ansi.TAB);
  }

  keyEscape(): void {
    this.write(ansi.ESCAPE);
  }

  keyCtrlC(): void {
    this.write(ansi.CTRL_C);
  }

  keyCtrlD(): void {
    this.write(ansi.CTRL_D);
  }

  /**
   * Left-click a viewport cell by sending an SGR mouse press then release.
   *
   * `row` and `col` are 0-based viewport coordinates (the same convention
   * as `getCursor()`). The program under test must have enabled mouse
   * tracking (e.g. `\x1b[?1000h\x1b[?1006h`) to receive the events.
   */
  click(row: number, col: number): void {
    if (!(0 <= row && row < this._rows && 0 <= col && col < this._cols)) {
      throw new RangeError(
        `Cell (${row}, ${col}) is outside the ${this._rows}x${this._cols} viewport`,
      );
    }
    const at = `${col + 1};${row + 1}`;
    this.write(`\x1b[<0;${at}M\x1b[<0;${at}m`);
  }

  /**
   * Create a locator that matches text on the screen.
   *
   * `text` is a string or RegExp to search for. With `full`, match the
   * entire line (stripped) instead of a substring. The locator is lazy: it
   * doesn't search until used.
   */
  getByText(text: string | RegExp, options: LocatorOptions = {}): Locator {
    return new Locator(this, text, options);
  }

  /** Return the current cursor position. */
  getCursor(): CursorPosition {
    const buffer = this._screen.buffer.active;
    return Object.freeze({ x: buffer.cursorX, y: buffer.cursorY });
  }

  private _line(y: number): IBufferLine {
    const line = this._screen.buffer.active.getLine(y);
    if (line === undefined) {
      throw new RangeError(`Row ${y} is outside the buffer`);
    }
    return line;
  }

  private _rowsFrom(start: number): string[][] {
    const buffer = this._screen.buffer.active;
    const cols = this._screen.cols;
    const cell = buffer.getNullCell();
    const result: string[][] = [];
    for (let y = start; y < buffer.length; y++) {
      const line = this._line(y);
      const row: string[] = [];
      for (let x = 0; x < cols; x++) {
        row.push(cellText(line.getCell(x, cell)));
      }
      result.push(row);
    }
    return result;
  }

  /**
   * Return the full buffer (scrollback + viewport) as a 2D array of characters.
   *
   * Scrollback lines come first (oldest at index 0), followed by
   * the visible viewport rows. This means `getByText()` and
   * other locator searches will find text that has scrolled off the
   * top of the screen.
   */
  getBuffer(): string[][] {
    return this._rowsFrom(0);
  }

  /** Return the visible viewport only (no scrollback). */
  getViewableBuffer(): string[][] {
    return this._rowsFrom(this._scrollbackLen());
  }

  /**
   * Number of scrollback rows preceding the viewport in `getBuffer()`.
   * @internal
   */
  _scrollbackLen(): number {
    return this._screen.buffer.active.baseY;
  }

  /**
   * Get the Char at a position in the full buffer coordinate system.
   *
   * Row 0 is the oldest scrollback line. Rows after the scrollback are
   * viewport rows.
   * @internal
   */
  _getCharAt(row: number, col: number): Char {
    const cell: IBufferCell | undefined = this._line(row).getCell(col);
    if (cell === undefined) {
      throw new RangeError(`Column ${col} is outside the buffer`);
    }
    return Object.freeze({
      data: cellText(cell),
      fg: colorName(cell.isFgDefault(), cell.isFgPalette(), cell.getFgColor()),
      bg: colorName(cell.isBgDefault(), cell.isBgPalette(), cell.getBgColor()),
      bold: cell.isBold() !== 0,
      italic: cell.isItalic() !== 0,
      underscore: cell.isUnderline() !== 0,
      reverse: cell.isInverse() !== 0,
    });
  }

  /** Whether the child process is still running. */
  get isAlive(): boolean {
    return this._child !== null && this._exit === null;
  }

  /**
   * Wait until the child process exits and return its exit code.
   *
   * Throws TimeoutError if the process doesn't exit within `timeout` milliseconds.
   */
  async wait({ timeout = 10_000 }: WaitOptions = {}): Promise<number | null> {
    this._requireChild();
    if (!(await this._exitedWithin(timeout))) {
      throw new TimeoutError(`Process did not exit within ${timeout}ms`);
    }
    return this.exitCode;
  }

  /** The exit code of the child process, or null if still running. */
  get exitCode(): number | null {
    if (this._exit === null || this._exit.signal) {
      return null;
    }
    return this._exit.exitCode;
  }

  /** Resize the terminal. */
  setSize({ rows, cols }: Size): void {
    const child = this._requireChild();
    this._rows = rows;
    this._cols = cols;
    this._screen.resize(cols, rows);
    child.resize(cols, rows);
  }

  /** Terminate the child process and stop reading its output. */
  async kill(): Promise<void> {
    this._running = false;
    this._reader?.dispose();
    this._reader = null;
    if (this._child !== null) {
      for (const signal of TERMINATE_SIGNALS) {
        if (!this.isAlive) {
          break;
        }
        this._child.kill(signal);
        await this._exitedWithin(DELAY_AFTER_TERMINATE);
      }
      if (this.isAlive) {
        await this._exitedWithin(REAP_TIMEOUT);
      }
    }
    await this._parsed;
  }

  /** Render the current screen as a box-drawn snapshot string. */
  toSnapshot(): string {
    return renderSnapshot(this);
  }

  /** Return the full buffer content (scrollback + viewport) as a string. */
  _getScreenText(): string {
    return this.getBuffer()
      .map((row) => rstrip(row.join("")))
      .join("\n");
  }
}
