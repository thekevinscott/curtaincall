/** Unit tests for expect() polling, color matching, and assertion classes. */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  LocatorAssertions,
  TerminalAssertions,
  colorMatches,
  expect,
  normalizeColor,
  poll,
  pollNegative,
} from "./expect.js";
import { Locator } from "./locator.js";
import { type Char, Terminal } from "./terminal.js";

function rejectsWith(promise: Promise<void>, pattern?: RegExp): Promise<void> {
  return assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof assert.AssertionError);
    if (pattern) {
      assert.match(err.message, pattern);
    }
    return true;
  });
}

describe("normalizeColor", () => {
  it("lowercases", () => {
    assert.equal(normalizeColor("RED"), "red");
  });

  it("strips whitespace", () => {
    assert.equal(normalizeColor("  red  "), "red");
  });
});

describe("colorMatches", () => {
  it("matches exact color", () => {
    assert.ok(colorMatches("red", "red"));
  });

  it("is case insensitive", () => {
    assert.ok(colorMatches("Red", "red"));
    assert.ok(colorMatches("RED", "red"));
  });

  it("matches alias darkred to red", () => {
    assert.ok(colorMatches("darkred", "red"));
  });

  it("matches alias darkgreen to green", () => {
    assert.ok(colorMatches("darkgreen", "green"));
  });

  it("matches alias brown to yellow", () => {
    assert.ok(colorMatches("brown", "yellow"));
  });

  it("matches alias darkcyan to cyan", () => {
    assert.ok(colorMatches("darkcyan", "cyan"));
  });

  it("matches alias darkmagenta to magenta", () => {
    assert.ok(colorMatches("darkmagenta", "magenta"));
  });

  it("matches alias darkblue to blue", () => {
    assert.ok(colorMatches("darkblue", "blue"));
  });

  it("matches alias lightgray to white", () => {
    assert.ok(colorMatches("lightgray", "white"));
  });

  it("rejects mismatched colors", () => {
    assert.ok(!colorMatches("red", "green"));
    assert.ok(!colorMatches("blue", "red"));
  });

  it("matches default color", () => {
    assert.ok(colorMatches("default", "default"));
  });

  it("rejects unknown expected with no alias", () => {
    assert.ok(!colorMatches("red", "unknown_color"));
  });

  it("matches black", () => {
    assert.ok(colorMatches("black", "black"));
  });
});

describe("poll", () => {
  it("returns immediately when check passes", async () => {
    await poll(() => true, { timeout: 1000 });
  });

  it("raises on timeout", async () => {
    await rejectsWith(
      poll(() => false, { timeout: 200, failureMessage: "timed out" }),
      /timed out/,
    );
  });

  it("includes screen in error", async () => {
    await rejectsWith(
      poll(() => false, {
        timeout: 200,
        failureMessage: "fail",
        screenFn: () => "screen content here",
      }),
      /screen content here/,
    );
  });

  it("does not include screen when no screenFn", async () => {
    await assert.rejects(
      poll(() => false, { timeout: 200, failureMessage: "just fail" }),
      (err: unknown) => {
        assert.ok(err instanceof assert.AssertionError);
        assert.ok(!err.message.includes("Screen content"));
        return true;
      },
    );
  });

  it("waits for condition to become true", async () => {
    const state = { count: 0 };

    const check = () => {
      state.count += 1;
      return state.count >= 3;
    };

    await poll(check, { timeout: 2000, interval: 50 });
    assert.ok(state.count >= 3);
  });

  it("respects custom interval", async () => {
    const state = { count: 0 };

    const check = () => {
      state.count += 1;
      return state.count >= 2;
    };

    await poll(check, { timeout: 2000, interval: 10 });
    assert.ok(state.count >= 2);
  });
});

describe("pollNegative", () => {
  it("returns immediately when check is false", async () => {
    await pollNegative(() => false, { timeout: 1000 });
  });

  it("raises when check stays true", async () => {
    await rejectsWith(
      pollNegative(() => true, {
        timeout: 200,
        failureMessage: "still visible",
      }),
    );
  });

  it("includes screen in error", async () => {
    await rejectsWith(
      pollNegative(() => true, {
        timeout: 200,
        failureMessage: "fail",
        screenFn: () => "screen dump",
      }),
      /screen dump/,
    );
  });

  it("waits for condition to become false", async () => {
    const state = { count: 0 };

    const check = () => {
      state.count += 1;
      return state.count < 3;
    };

    await pollNegative(check, { timeout: 2000, interval: 50 });
    assert.ok(state.count >= 3);
  });
});

interface MockLocatorOptions {
  visible?: boolean;
  text?: string;
  content?: string;
  cells?: { row: number; col: number }[];
  char?: Partial<Char>;
  screen?: string;
}

function mockLocator({
  visible = true,
  text = "test",
  content = "",
  cells = [],
  char = {},
  screen = "mock screen",
}: MockLocatorOptions = {}) {
  return {
    isVisible: () => visible,
    text: () => content,
    cells,
    _text: text,
    _terminal: {
      _getScreenText: () => screen,
      _getCharAt: () => char as Char,
    },
  };
}

function coloredLocator(text: string, char: Partial<Char>) {
  return mockLocator({ text, cells: [{ row: 0, col: 0 }], char, screen: "" });
}

describe("locator assertions", () => {
  it("toBeVisible passes when visible", async () => {
    const loc = mockLocator({ visible: true });
    const assertions = new LocatorAssertions(loc);
    await assertions.toBeVisible({ timeout: 500 });
  });

  it("toBeVisible raises when not visible", async () => {
    const loc = mockLocator({ visible: false, text: "MISSING" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.toBeVisible({ timeout: 200 }), /MISSING/);
  });

  it("notToBeVisible passes when not visible", async () => {
    const loc = mockLocator({ visible: false });
    const assertions = new LocatorAssertions(loc);
    await assertions.notToBeVisible({ timeout: 500 });
  });

  it("notToBeVisible raises when visible", async () => {
    const loc = mockLocator({ visible: true, text: "PRESENT" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.notToBeVisible({ timeout: 200 }), /PRESENT/);
  });

  it("toContainText passes", async () => {
    const loc = mockLocator({ text: "Hello World", content: "Hello World" });
    const assertions = new LocatorAssertions(loc);
    await assertions.toContainText("World", { timeout: 500 });
  });

  it("toContainText raises on mismatch", async () => {
    const loc = mockLocator({ text: "Hello", content: "Hello" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.toContainText("NOPE", { timeout: 200 }));
  });

  it("toHaveFgColor passes", async () => {
    const loc = coloredLocator("E", { fg: "red" });
    const assertions = new LocatorAssertions(loc);
    await assertions.toHaveFgColor("red", { timeout: 500 });
  });

  it("toHaveFgColor raises on mismatch", async () => {
    const loc = coloredLocator("E", { fg: "red" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.toHaveFgColor("green", { timeout: 200 }));
  });

  it("toHaveFgColor fails when no cells", async () => {
    const loc = mockLocator({ text: "MISSING", screen: "" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.toHaveFgColor("red", { timeout: 200 }));
  });

  it("toHaveBgColor passes", async () => {
    const loc = coloredLocator("H", { bg: "blue" });
    const assertions = new LocatorAssertions(loc);
    await assertions.toHaveBgColor("blue", { timeout: 500 });
  });

  it("toHaveBgColor raises on mismatch", async () => {
    const loc = coloredLocator("H", { bg: "blue" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.toHaveBgColor("red", { timeout: 200 }));
  });

  it("toHaveBgColor fails when no cells", async () => {
    const loc = mockLocator({ text: "MISSING", screen: "" });
    const assertions = new LocatorAssertions(loc);
    await rejectsWith(assertions.toHaveBgColor("red", { timeout: 200 }));
  });
});

function mockTerminal(isAlive: boolean) {
  return {
    isAlive,
    toSnapshot: () => "snapshot string",
    _getScreenText: () => "",
  };
}

describe("terminal assertions", () => {
  it("returns snapshot", () => {
    const assertions = new TerminalAssertions(mockTerminal(false));
    assert.equal(assertions.toMatchSnapshot(), "snapshot string");
  });

  it("toHaveExited passes when dead", async () => {
    const assertions = new TerminalAssertions(mockTerminal(false));
    await assertions.toHaveExited({ timeout: 500 });
  });

  it("toHaveExited raises when alive", async () => {
    const assertions = new TerminalAssertions(mockTerminal(true));
    await rejectsWith(
      assertions.toHaveExited({ timeout: 200 }),
      /Expected process to have exited/,
    );
  });
});

describe("expect function", () => {
  it("returns locator assertions for locator", () => {
    const term = new Terminal("echo test");
    const loc = new Locator(term, "test");
    const result = expect(loc);
    assert.ok(result instanceof LocatorAssertions);
  });

  it("returns terminal assertions for terminal", () => {
    const term = new Terminal("echo test");
    const result = expect(term);
    assert.ok(result instanceof TerminalAssertions);
  });

  it("raises for invalid type", () => {
    assert.throws(
      // @ts-expect-error a string is neither a Locator nor a Terminal
      () => expect("not a locator"),
      (err: unknown) => {
        assert.ok(err instanceof TypeError);
        assert.match(err.message, /expect\(\) requires/);
        return true;
      },
    );
  });
});
