/** Unit tests for ANSI escape constants. */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import * as ansi from "./ansi.js";

describe("ansi constants", () => {
  it("defines arrow keys", () => {
    assert.equal(ansi.UP, "\x1b[A");
    assert.equal(ansi.DOWN, "\x1b[B");
    assert.equal(ansi.RIGHT, "\x1b[C");
    assert.equal(ansi.LEFT, "\x1b[D");
  });

  it("defines control keys", () => {
    assert.equal(ansi.ENTER, "\r");
    assert.equal(ansi.BACKSPACE, "\x7f");
    assert.equal(ansi.DELETE, "\x1b[3~");
    assert.equal(ansi.TAB, "\t");
    assert.equal(ansi.ESCAPE, "\x1b");
    assert.equal(ansi.CTRL_C, "\x03");
    assert.equal(ansi.CTRL_D, "\x04");
  });

  it("uses escape prefix for arrows", () => {
    for (const key of [ansi.UP, ansi.DOWN, ansi.LEFT, ansi.RIGHT]) {
      assert.ok(key.startsWith("\x1b["));
    }
  });
});
