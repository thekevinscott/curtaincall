/** expect() with auto-waiting assertions. */

import { AssertionError } from "node:assert";
import { setTimeout as sleep } from "node:timers/promises";
import { inspect } from "node:util";
import { Locator } from "./locator.js";
import { Terminal } from "./terminal.js";

export interface TimeoutOptions {
  /** Milliseconds. */
  timeout?: number;
}

export interface PollOptions {
  timeout: number;
  interval?: number;
  failureMessage?: string;
  screenFn?: () => string;
}

const COLOR_ALIASES = new Map<string, ReadonlySet<string>>([
  ["red", new Set(["red", "darkred"])],
  ["green", new Set(["green", "darkgreen"])],
  ["blue", new Set(["blue", "darkblue"])],
  ["yellow", new Set(["yellow", "brown"])],
  ["cyan", new Set(["cyan", "darkcyan"])],
  ["magenta", new Set(["magenta", "darkmagenta"])],
  ["white", new Set(["white", "lightgray"])],
  ["black", new Set(["black"])],
  ["default", new Set(["default"])],
]);

/** Normalize a color name to lowercase. */
export function normalizeColor(color: string): string {
  return color.toLowerCase().trim();
}

/** Check if an actual cell color matches the expected color name. */
export function colorMatches(actual: string, expected: string): boolean {
  const actualLower = actual.toLowerCase();
  const expectedLower = expected.toLowerCase();

  if (actualLower === expectedLower) {
    return true;
  }

  return COLOR_ALIASES.get(expectedLower)?.has(actualLower) ?? false;
}

async function pollUntil(
  checkFn: () => boolean,
  wanted: boolean,
  { timeout, interval = 100, failureMessage = "", screenFn }: PollOptions,
): Promise<void> {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    if (checkFn() === wanted) {
      return;
    }
    await sleep(interval);
  }

  let message = failureMessage;
  if (screenFn) {
    message += `\n\nScreen content:\n${screenFn()}`;
  }
  throw new AssertionError({ message });
}

/** Poll until checkFn() returns true or timeout expires. */
export function poll(
  checkFn: () => boolean,
  options: PollOptions,
): Promise<void> {
  return pollUntil(checkFn, true, options);
}

/** Poll until checkFn() returns false or timeout expires. */
export function pollNegative(
  checkFn: () => boolean,
  options: PollOptions,
): Promise<void> {
  return pollUntil(checkFn, false, options);
}

type AssertedLocator = Pick<Locator, "isVisible" | "cells" | "text"> & {
  readonly _text: string | RegExp;
  readonly _terminal: Pick<Terminal, "_getScreenText" | "_getCharAt">;
};

type AssertedTerminal = Pick<
  Terminal,
  "isAlive" | "toSnapshot" | "_getScreenText"
>;

/** Assertions on a Locator with auto-waiting. */
export class LocatorAssertions {
  private readonly _locator: AssertedLocator;

  constructor(locator: AssertedLocator) {
    this._locator = locator;
  }

  private _screenFn = (): string => this._locator._terminal._getScreenText();

  /** Assert the locator's text is visible on screen. */
  toBeVisible({ timeout = 5000 }: TimeoutOptions = {}): Promise<void> {
    return poll(() => this._locator.isVisible(), {
      timeout,
      failureMessage: `Expected text to be visible: ${inspect(this._locator._text)}`,
      screenFn: this._screenFn,
    });
  }

  /** Assert the locator's text is NOT visible on screen. */
  notToBeVisible({ timeout = 5000 }: TimeoutOptions = {}): Promise<void> {
    return pollNegative(() => this._locator.isVisible(), {
      timeout,
      failureMessage: `Expected text NOT to be visible: ${inspect(this._locator._text)}`,
      screenFn: this._screenFn,
    });
  }

  private _toHaveColor(
    ground: "fg" | "bg",
    color: string,
    timeout: number,
  ): Promise<void> {
    const check = (): boolean => {
      const cells = this._locator.cells;
      if (cells.length === 0) {
        return false;
      }
      const terminal = this._locator._terminal;
      return cells.every((cell) =>
        colorMatches(terminal._getCharAt(cell.row, cell.col)[ground], color),
      );
    };

    return poll(check, {
      timeout,
      failureMessage: `Expected text ${inspect(this._locator._text)} to have ${ground} color ${inspect(color)}`,
      screenFn: this._screenFn,
    });
  }

  /** Assert the matched text has the expected foreground color. */
  toHaveFgColor(
    color: string,
    { timeout = 5000 }: TimeoutOptions = {},
  ): Promise<void> {
    return this._toHaveColor("fg", color, timeout);
  }

  /** Assert the matched text has the expected background color. */
  toHaveBgColor(
    color: string,
    { timeout = 5000 }: TimeoutOptions = {},
  ): Promise<void> {
    return this._toHaveColor("bg", color, timeout);
  }

  /** Assert the matched text contains the given substring. */
  toContainText(
    text: string,
    { timeout = 5000 }: TimeoutOptions = {},
  ): Promise<void> {
    return poll(() => this._locator.text().includes(text), {
      timeout,
      failureMessage: `Expected locator to contain text ${inspect(text)}`,
      screenFn: this._screenFn,
    });
  }
}

/** Assertions on a Terminal with auto-waiting. */
export class TerminalAssertions {
  private readonly _terminal: AssertedTerminal;

  constructor(terminal: AssertedTerminal) {
    this._terminal = terminal;
  }

  /** Assert that the terminal's process has exited. */
  toHaveExited({ timeout = 10_000 }: TimeoutOptions = {}): Promise<void> {
    return poll(() => !this._terminal.isAlive, {
      timeout,
      failureMessage: "Expected process to have exited",
      screenFn: () => this._terminal._getScreenText(),
    });
  }

  /** Return the terminal snapshot for comparison. */
  toMatchSnapshot(): string {
    return this._terminal.toSnapshot();
  }
}

function typeName(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "object") {
    return value.constructor?.name ?? "Object";
  }
  return typeof value;
}

/**
 * Create assertions on a locator or terminal.
 *
 * Usage:
 *     await expect(term.getByText("Hello")).toBeVisible();
 *     expect(term).toMatchSnapshot();
 */
export function expect(target: Locator): LocatorAssertions;
export function expect(target: Terminal): TerminalAssertions;
export function expect(
  target: Locator | Terminal,
): LocatorAssertions | TerminalAssertions {
  if (target instanceof Locator) {
    return new LocatorAssertions(target);
  }
  if (target instanceof Terminal) {
    return new TerminalAssertions(target);
  }
  throw new TypeError(
    `expect() requires a Locator or Terminal, got ${typeName(target)}`,
  );
}
