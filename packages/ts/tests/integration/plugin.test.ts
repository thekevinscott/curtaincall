/** Integration tests for the vitest terminal fixture. */

import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("terminal fixture", () => {
  it("is available from the extended test", async ({
    terminal,
    fixtureCmd,
  }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
  });

  it("supports multiple terminals", async ({ terminal, fixtureCmd }) => {
    const term1 = terminal(fixtureCmd("hello.py"));
    const term2 = terminal(fixtureCmd("hello.py"), { rows: 24, cols: 40 });
    await expect(term1.getByText("Hello, World!")).toBeVisible();
    await expect(term2.getByText("Hello, World!")).toBeVisible();
  });

  it("cleans up all terminals after test", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    // Fixture teardown will handle cleanup
  });
});
