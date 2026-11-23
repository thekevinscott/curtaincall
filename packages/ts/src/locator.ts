/** Locator for finding text on the terminal screen. */

import { inspect } from "node:util";
import type { Terminal } from "./terminal.js";
import { codePointLength, lstrip, strip } from "./text.js";
import { LookupError } from "./types.js";

/** A matched cell position on the screen. */
export interface CellMatch {
  readonly row: number;
  readonly col: number;
}

export interface LocatorOptions {
  /** Match the entire line (stripped) instead of a substring. */
  full?: boolean;
}

type LocatorTerminal = Pick<
  Terminal,
  "getBuffer" | "click" | "_scrollbackLen" | "_getScreenText" | "_getCharAt"
>;

function cell(row: number, col: number): CellMatch {
  return Object.freeze({ row, col });
}

function withFlags(pattern: RegExp, source: string, global: boolean): RegExp {
  const flags = pattern.flags.replace(/[gy]/g, "");
  return new RegExp(source, global ? `${flags}g` : flags);
}

/**
 * Lazy locator that finds text on a terminal screen.
 *
 * Created by `Terminal.getByText()`. Doesn't search until properties
 * are accessed or the locator is passed to `expect()`.
 */
export class Locator {
  /** @internal */
  readonly _terminal: LocatorTerminal;
  /** @internal */
  readonly _text: string | RegExp;
  /** @internal */
  readonly _full: boolean;

  constructor(
    terminal: LocatorTerminal,
    text: string | RegExp,
    { full = false }: LocatorOptions = {},
  ) {
    this._terminal = terminal;
    this._text = text;
    this._full = full;
  }

  /** Find all matching cell positions on the screen. */
  get cells(): CellMatch[] {
    const buffer = this._terminal.getBuffer();
    const matches: CellMatch[] = [];

    buffer.forEach((row, rowIdx) => {
      const line = row.join("");
      if (this._full) {
        this._matchFullLine(line, rowIdx, matches);
      } else {
        this._matchSubstring(line, rowIdx, matches);
      }
    });

    return matches;
  }

  private _matchFullLine(
    line: string,
    rowIdx: number,
    matches: CellMatch[],
  ): void {
    const stripped = strip(line);
    const offset = codePointLength(line) - codePointLength(lstrip(line));
    const matched =
      this._text instanceof RegExp
        ? this._fullMatch(stripped) !== null
        : stripped === this._text;

    if (matched) {
      for (let colIdx = 0; colIdx < codePointLength(stripped); colIdx++) {
        matches.push(cell(rowIdx, offset + colIdx));
      }
    }
  }

  private _matchSubstring(
    line: string,
    rowIdx: number,
    matches: CellMatch[],
  ): void {
    const push = (index: number, matched: string) => {
      const start = codePointLength(line.slice(0, index));
      for (let colIdx = 0; colIdx < codePointLength(matched); colIdx++) {
        matches.push(cell(rowIdx, start + colIdx));
      }
    };

    if (this._text instanceof RegExp) {
      const pattern = withFlags(this._text, this._text.source, true);
      for (const m of line.matchAll(pattern)) {
        push(m.index, m[0]);
      }
    } else {
      let start = 0;
      while (true) {
        const idx = line.indexOf(this._text, start);
        if (idx === -1 || idx >= line.length) {
          break;
        }
        push(idx, this._text);
        start = idx + ((line.codePointAt(idx) ?? 0) > 0xffff ? 2 : 1);
      }
    }
  }

  private _fullMatch(stripped: string): string | null {
    const pattern = this._text as RegExp;
    const anchored = withFlags(pattern, `^(?:${pattern.source})$`, false);
    return anchored.exec(stripped)?.[0] ?? null;
  }

  /** Check if the text is currently visible on screen (no waiting). */
  isVisible(): boolean {
    return this.cells.length > 0;
  }

  /**
   * Left-click the first matched cell in the viewport.
   *
   * Doesn't wait: assert `expect(locator).toBeVisible()` first if the
   * text may not have rendered yet. Throws LookupError if no match is in
   * the viewport (matches that have scrolled into scrollback can't be clicked).
   */
  click(): void {
    const cells = this.cells;
    const scrollback = this._terminal._scrollbackLen();
    const visible = cells.filter((c) => c.row >= scrollback);
    const first = visible[0];
    if (first === undefined) {
      const where =
        cells.length > 0
          ? "has scrolled out of the viewport"
          : "is not on screen";
      throw new LookupError(
        `Cannot click ${inspect(this._text)}: text ${where}`,
      );
    }
    this._terminal.click(first.row - scrollback, first.col);
  }

  /** Return the matched text content. */
  text(): string {
    if (this._text instanceof RegExp) {
      const search = withFlags(this._text, this._text.source, false);
      for (const row of this._terminal.getBuffer()) {
        const line = row.join("");
        const matched = this._full
          ? this._fullMatch(strip(line))
          : (search.exec(line)?.[0] ?? null);
        if (matched !== null) {
          return matched;
        }
      }
      return "";
    }
    return this._text;
  }
}
