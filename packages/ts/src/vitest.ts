/** vitest fixture providing the terminal factory. */

import { test as base } from "vitest";
import { Terminal, type TerminalOptions } from "./terminal.js";

export type TerminalFactory = (
  command: string,
  options?: TerminalOptions,
) => Terminal;

/** Create a terminal factory function that tracks created terminals. */
export function createTerminalFactory(terminals: Terminal[]): TerminalFactory {
  return (
    command,
    { rows = 30, cols = 80, env, history = 1000, suppressStderr = false } = {},
  ) => {
    const term = new Terminal(command, {
      rows,
      cols,
      env,
      history,
      suppressStderr,
    });
    term.start();
    terminals.push(term);
    return term;
  };
}

/**
 * `test` with a `terminal` session factory.
 *
 * Creates isolated PTY sessions. All terminals are automatically
 * cleaned up after the test completes.
 *
 * Usage:
 *     test("something", async ({ terminal }) => {
 *       const term = terminal("python my_cli.py");
 *       // ... test interactions ...
 *     });
 */
export const test = base.extend<{ terminal: TerminalFactory }>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest requires destructuring
  terminal: async ({}, use) => {
    const terminals: Terminal[] = [];

    await use(createTerminalFactory(terminals));

    for (const t of terminals) {
      await t.kill();
    }
  },
});
