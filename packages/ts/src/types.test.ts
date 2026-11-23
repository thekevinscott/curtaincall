/** Unit tests for core data types. */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { CellStyle, CursorPosition } from "./types.js";

describe("cursor position", () => {
  it("stores x and y", () => {
    const pos: CursorPosition = { x: 5, y: 10 };
    assert.equal(pos.x, 5);
    assert.equal(pos.y, 10);
  });

  it("is frozen", () => {
    const pos: CursorPosition = { x: 0, y: 0 };
    // @ts-expect-error readonly is enforced by the compiler, not at runtime
    pos.x = 1;
  });

  it("supports equality", () => {
    const pos: CursorPosition = { x: 1, y: 2 };
    assert.deepEqual(pos, { x: 1, y: 2 });
    assert.notDeepEqual(pos, { x: 3, y: 4 });
  });
});

describe("cell style", () => {
  const flags = {
    bold: false,
    italic: false,
    underscore: false,
    reverse: false,
  };

  it("stores colors", () => {
    const style: CellStyle = { fg: "red", bg: "blue", ...flags };
    assert.equal(style.fg, "red");
    assert.equal(style.bg, "blue");
  });

  // An interface carries no defaults; every flag is required.
  it.skip("has defaults for flags", () => {});

  it("stores style flags", () => {
    const style: CellStyle = {
      fg: "red",
      bg: "blue",
      ...flags,
      bold: true,
      italic: true,
    };
    assert.equal(style.bold, true);
    assert.equal(style.italic, true);
  });

  it("is frozen", () => {
    const style: CellStyle = { fg: "red", bg: "blue", ...flags };
    // @ts-expect-error readonly is enforced by the compiler, not at runtime
    style.fg = "green";
  });
});
