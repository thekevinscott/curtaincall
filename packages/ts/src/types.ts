/** Core data types for curtaincall. */

/** Cursor position on the terminal screen. */
export interface CursorPosition {
  readonly x: number;
  readonly y: number;
}

/** Style information for a terminal cell. */
export interface CellStyle {
  readonly fg: string;
  readonly bg: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underscore: boolean;
  readonly reverse: boolean;
}

/** Raised by `Terminal.wait()` when the process outlives the timeout. */
export class TimeoutError extends Error {
  override name = "TimeoutError";
}

/** Raised by `Locator.click()` when no match is in the viewport. */
export class LookupError extends Error {
  override name = "LookupError";
}
