/** Integration tests for box-drawing table output and snapshots. */

import assert from "node:assert/strict";
import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("table output", () => {
  it("renders table content", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("table.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("Results")).toBeVisible();
    await expect(term.getByText("Alice")).toBeVisible();
    await expect(term.getByText("Bob")).toBeVisible();
  });

  it("renders table headers", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("table.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("Name")).toBeVisible();
    await expect(term.getByText("Score")).toBeVisible();
  });

  it("matches scores with regex", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("table.py"), { rows: 10, cols: 40 });
    await expect(term.getByText(/\d{2}/)).toBeVisible();
  });

  it("produces stable snapshot", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("table.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("Results")).toBeVisible();
    const snap1 = term.toSnapshot();
    const snap2 = term.toSnapshot();
    assert.equal(snap1, snap2);
    assert.ok(snap1.includes("Alice"));
    assert.ok(snap1.includes("Bob"));
  });
});
