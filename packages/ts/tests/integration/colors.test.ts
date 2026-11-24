/** Integration tests for color/style assertions. */

import assert from "node:assert/strict";
import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("color assertions", () => {
  it("detects red foreground", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("colors.py"));
    await expect(term.getByText("ERROR")).toBeVisible();
    await expect(term.getByText("ERROR")).toHaveFgColor("red");
  });

  it("detects green foreground", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("colors.py"));
    await expect(term.getByText("OK")).toBeVisible();
    await expect(term.getByText("OK")).toHaveFgColor("green");
  });

  it("detects blue background", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("colors.py"));
    await expect(term.getByText("HIGHLIGHT")).toBeVisible();
    await expect(term.getByText("HIGHLIGHT")).toHaveBgColor("blue");
  });

  it("raises on wrong fg color", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("colors.py"));
    await expect(term.getByText("ERROR")).toBeVisible();
    await assert.rejects(
      expect(term.getByText("ERROR")).toHaveFgColor("green", { timeout: 500 }),
      assert.AssertionError,
    );
  });

  it("raises on wrong bg color", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("colors.py"));
    await expect(term.getByText("HIGHLIGHT")).toBeVisible();
    await assert.rejects(
      expect(term.getByText("HIGHLIGHT")).toHaveBgColor("red", {
        timeout: 500,
      }),
      assert.AssertionError,
    );
  });
});
