/** Unit tests for snapshot rendering logic. */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { renderSnapshot } from "./snapshot.js";

function mockTerminal(lines: string[], cols = 20) {
  const buffer = lines.map((line) => [...line.padEnd(cols)]);
  return { getViewableBuffer: () => buffer, _screen: { cols } };
}

describe("renderSnapshot", () => {
  it("wraps content in box borders", () => {
    const term = mockTerminal(["hello", "world"], 10);
    const snap = renderSnapshot(term);
    const lines = snap.split("\n");
    assert.equal(lines[0], `╭${"─".repeat(10)}╮`);
    assert.equal(lines.at(-1), `╯${"─".repeat(10)}╰`);
  });

  it("uses vertical bars for content rows", () => {
    const term = mockTerminal(["hello"], 10);
    const snap = renderSnapshot(term);
    const lines = snap.split("\n");
    assert.ok(lines[1]?.startsWith("│"));
    assert.ok(lines[1]?.endsWith("│"));
  });

  it("pads content to full width", () => {
    const term = mockTerminal(["hi"], 10);
    const snap = renderSnapshot(term);
    const lines = snap.split("\n");
    // Content line: border + 10 chars + border = 12 total
    assert.equal(lines[1]?.length, 12);
  });

  it("preserves content text", () => {
    const term = mockTerminal(["Hello, World!"], 20);
    const snap = renderSnapshot(term);
    assert.ok(snap.includes("Hello, World!"));
  });

  it("renders correct number of rows", () => {
    const term = mockTerminal(["line1", "line2", "line3"], 10);
    const snap = renderSnapshot(term);
    const lines = snap.split("\n");
    // 1 top border + 3 content + 1 bottom border
    assert.equal(lines.length, 5);
  });

  it("is stable across calls", () => {
    const term = mockTerminal(["stable content"], 20);
    const snap1 = renderSnapshot(term);
    const snap2 = renderSnapshot(term);
    assert.equal(snap1, snap2);
  });
});
