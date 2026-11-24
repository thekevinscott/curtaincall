/** Unit tests for Locator text matching logic. */

import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { Locator } from "./locator.js";
import { LookupError } from "./types.js";

function mockTerminal(lines: string[], cols = 80) {
  const buffer = lines.map((line) => [...line.padEnd(cols)]);
  return {
    getBuffer: vi.fn(() => buffer),
    click: vi.fn(),
    _scrollbackLen: vi.fn(() => 0),
    _getScreenText: vi.fn(() => ""),
    _getCharAt: vi.fn(),
  };
}

describe("locator substring match", () => {
  it("finds substring in line", () => {
    const term = mockTerminal(["Hello, World!", "second line"]);
    const loc = new Locator(term, "World");
    assert.ok(loc.isVisible());
    assert.equal(loc.cells.length, 5); // W, o, r, l, d
  });

  it("returns correct cell positions", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, "World");
    const cells = loc.cells;
    assert.equal(cells[0]?.row, 0);
    assert.equal(cells[0]?.col, 7); // "Hello, " is 7 chars
  });

  it("returns empty for missing text", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, "MISSING");
    assert.ok(!loc.isVisible());
    assert.equal(loc.cells.length, 0);
  });

  it("finds multiple occurrences", () => {
    const term = mockTerminal(["aa bb aa"]);
    const loc = new Locator(term, "aa");
    const cells = loc.cells;
    // Two occurrences, 2 cells each
    assert.equal(cells.length, 4);
  });

  it("finds across multiple rows", () => {
    const term = mockTerminal(["first Hello", "second Hello"]);
    const loc = new Locator(term, "Hello");
    const cells = loc.cells;
    const rows = new Set(cells.map((c) => c.row));
    assert.deepEqual(rows, new Set([0, 1]));
  });

  it("returns text for string locator", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, "Hello");
    assert.equal(loc.text(), "Hello");
  });
});

describe("locator full match", () => {
  it("matches when stripped line equals text", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, "Hello, World!", { full: true });
    assert.ok(loc.isVisible());
  });

  it("rejects partial match", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, "Hello", { full: true });
    assert.ok(!loc.isVisible());
  });

  it("matches with surrounding whitespace", () => {
    const term = mockTerminal(["  Hello  "], 20);
    const loc = new Locator(term, "Hello", { full: true });
    assert.ok(loc.isVisible());
  });
});

describe("locator regex match", () => {
  it("matches regex pattern", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, /Hello, \w+!/);
    assert.ok(loc.isVisible());
  });

  it("returns matched text", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, /Hello, \w+!/);
    assert.equal(loc.text(), "Hello, World!");
  });

  it("rejects non matching regex", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, /Goodbye, \w+!/);
    assert.ok(!loc.isVisible());
  });

  it("supports full match with regex", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, /Hello, \w+!/, { full: true });
    assert.ok(loc.isVisible());
  });

  it("rejects partial regex in full mode", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, /Hello/, { full: true });
    assert.ok(!loc.isVisible());
  });

  it("returns empty string for non matching regex", () => {
    const term = mockTerminal(["Hello, World!"]);
    const loc = new Locator(term, /NOPE/);
    assert.equal(loc.text(), "");
  });
});

describe("locator click", () => {
  it("clicks the first matched cell", () => {
    const term = mockTerminal(["", "  [ OK ]  [ OK ]"]);
    new Locator(term, "OK").click();
    assert.deepEqual(term.click.mock.calls, [[1, 4]]);
  });

  it("converts buffer rows to viewport rows", () => {
    const term = mockTerminal(["old", "old", "Save"]);
    term._scrollbackLen.mockReturnValue(2);
    new Locator(term, "Save").click();
    assert.deepEqual(term.click.mock.calls, [[0, 0]]);
  });

  it("skips matches in scrollback", () => {
    const term = mockTerminal(["Save old", "", "Save new"]);
    term._scrollbackLen.mockReturnValue(1);
    new Locator(term, "Save").click();
    assert.deepEqual(term.click.mock.calls, [[1, 0]]);
  });

  it("raises when text is not on screen", () => {
    const term = mockTerminal(["Hello"]);
    assert.throws(
      () => new Locator(term, "Save").click(),
      (err: unknown) => {
        assert.ok(err instanceof LookupError);
        assert.match(err.message, /'Save': text is not on screen/);
        return true;
      },
    );
    assert.equal(term.click.mock.calls.length, 0);
  });

  it("raises when text has scrolled out of the viewport", () => {
    const term = mockTerminal(["Save", "Hello"]);
    term._scrollbackLen.mockReturnValue(1);
    assert.throws(
      () => new Locator(term, "Save").click(),
      (err: unknown) => {
        assert.ok(err instanceof LookupError);
        assert.match(err.message, /has scrolled out of the viewport/);
        return true;
      },
    );
    assert.equal(term.click.mock.calls.length, 0);
  });
});

// Python indexes strings by code point; these pin the same columns in UTF-16.
describe("locator code point columns", () => {
  it("counts an astral character as one column", () => {
    const term = mockTerminal(["\u{1F600} World"]);
    const cells = new Locator(term, "World").cells;
    assert.equal(cells[0]?.col, 2);
    assert.equal(cells.length, 5);
  });
});
