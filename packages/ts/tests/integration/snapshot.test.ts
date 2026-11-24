/** Integration tests for snapshot serialization with real terminals. */

import assert from "node:assert/strict";
import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("snapshot integration", () => {
  it("produces snapshot from real terminal", async ({
    terminal,
    fixtureCmd,
  }) => {
    const term = terminal(fixtureCmd("hello.py"), { rows: 5, cols: 30 });
    await expect(term.getByText("Hello, World!")).toBeVisible();
    const snap = term.toSnapshot();
    assert.ok(snap.includes("Hello, World!"));
  });

  it("has correct border width", async ({ terminal, fixtureCmd }) => {
    const cols = 40;
    const term = terminal(fixtureCmd("hello.py"), { rows: 5, cols });
    await expect(term.getByText("Hello, World!")).toBeVisible();
    const snap = term.toSnapshot();
    const lines = snap.split("\n");
    // Top border: corner + cols dashes + corner
    assert.equal(lines[0]?.length, cols + 2);
  });

  it("is stable across calls", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"), { rows: 5, cols: 30 });
    await expect(term.getByText("Hello, World!")).toBeVisible();
    const snap1 = term.toSnapshot();
    const snap2 = term.toSnapshot();
    assert.equal(snap1, snap2);
  });

  it("reflects terminal content changes", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("ready>")).toBeVisible();
    const snapBefore = term.toSnapshot();

    term.submit("test input");
    await expect(term.getByText("echo: test input")).toBeVisible();
    const snapAfter = term.toSnapshot();

    assert.notEqual(snapBefore, snapAfter);
    assert.ok(snapAfter.includes("echo: test input"));
  });
});
