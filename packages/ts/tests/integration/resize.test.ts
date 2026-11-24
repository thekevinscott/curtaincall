/** Integration tests for cursor position and terminal resize. */

import assert from "node:assert/strict";
import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("cursor", () => {
  it("returns cursor position", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
    const cursor = term.getCursor();
    assert.ok(cursor.x >= 0);
    assert.ok(cursor.y >= 0);
  });
});

describe("resize", () => {
  it("shows initial size", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("resize_detect.py"), {
      rows: 24,
      cols: 80,
    });
    await expect(term.getByText("80x24")).toBeVisible();
  });

  it("detects resize", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("resize_detect.py"), {
      rows: 24,
      cols: 80,
    });
    await expect(term.getByText("80x24")).toBeVisible();
    term.setSize({ rows: 40, cols: 120 });
    await expect(term.getByText("120x40")).toBeVisible();
  });
});
