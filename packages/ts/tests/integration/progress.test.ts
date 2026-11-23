/** Integration tests for carriage-return based progress output. */

import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("progress output", () => {
  it("shows final progress", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("progress.py"), { rows: 5, cols: 40 });
    await expect(term.getByText("100%")).toBeVisible();
  });

  it("overwrites previous line", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("progress.py"), { rows: 5, cols: 40 });
    await expect(term.getByText("Done!")).toBeVisible();
    // The carriage return should overwrite earlier progress values
    // Only the final "100% Done!" should be visible
    await expect(term.getByText("20%")).notToBeVisible();
  });
});
