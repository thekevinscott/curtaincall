/** Curtaincall: Testing library for terminal applications. */

import { createRequire } from "node:module";

export * as ansi from "./ansi.js";
export {
  expect,
  type LocatorAssertions,
  type TerminalAssertions,
  type TimeoutOptions,
} from "./expect.js";
export { type CellMatch, Locator, type LocatorOptions } from "./locator.js";
export {
  type Size,
  Terminal,
  type TerminalOptions,
  type WaitOptions,
} from "./terminal.js";
export {
  type CellStyle,
  type CursorPosition,
  LookupError,
  TimeoutError,
} from "./types.js";

const pkg = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

export const version: string = pkg.version;
