# curtaincall (TypeScript)

Testing library for terminal applications. A TypeScript port of the Python [curtaincall](../../README.md): it spawns real PTY sessions, emulates a VT100 terminal, and provides an assertion API with auto-waiting locators.

Requirements: Node 22+, Linux or macOS (Unix PTYs), vitest for the `terminal` fixture.

## Quick Start

```ts
import { expect } from "curtaincall";
import { test } from "curtaincall/vitest";

test("git help", async ({ terminal }) => {
  const term = terminal("git --help");
  await expect(term.getByText("usage: git")).toBeVisible();
});

test("interactive cli", async ({ terminal }) => {
  const term = terminal("python my_cli.py");
  term.submit("hello");
  await expect(term.getByText("Hello!")).toBeVisible();
});
```

The `terminal` fixture is a factory: `terminal(command, { rows: 30, cols: 80, env })`. Every terminal it creates is killed after the test.

## Differences from the Python API

- Names are camelCase: `get_by_text` is `getByText`, `to_be_visible` is `toBeVisible`.
- Keyword arguments are one options object: `terminal("cmd", { rows: 10 })`, `toBeVisible({ timeout: 2000 })`.
- Assertions that wait return a Promise and must be awaited. Reads and input (`getByText`, `write`, `submit`, `toSnapshot`) are synchronous.
- Timeouts are in milliseconds: 5000 by default for locator assertions, 10000 for `wait()` and `toHaveExited()`.
- `expect` shares its name with vitest's. Import one under an alias if a file needs both: `import { expect as expectTerminal } from "curtaincall"`.
- The fixture is not discovered automatically. Import `test` from `curtaincall/vitest`.

## Development

From the repo root: `just ts-install`, `just ts-lint`, `just ts-typecheck`, `just ts-build`, `just ts-test`. The integration tests run the Python fixtures in `tests/fixtures/` with `python3`.
