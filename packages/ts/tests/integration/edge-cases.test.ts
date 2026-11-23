/** Integration tests for edge cases and failure modes. */

import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("auto waiting", () => {
  it("waits for sequential output", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("slow_output.py"));
    await expect(term.getByText("line 1")).toBeVisible();
    await expect(term.getByText("line 2")).toBeVisible();
    await expect(term.getByText("line 3")).toBeVisible();
    await expect(term.getByText("done")).toBeVisible();
  });
});

describe("locator edge cases", () => {
  it("matches regex across output", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText(/Hello, \w+!/)).toBeVisible();
  });

  it("full match rejects partial line", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
    // "Hello" alone is not the full line
    assert.ok(!term.getByText("Hello", { full: true }).isVisible());
  });

  it("full match accepts exact line", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!", { full: true })).toBeVisible();
  });

  it("toContainText works", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
    await expect(term.getByText("Hello, World!")).toContainText("World");
  });

  it("finds regex text content", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    const loc = term.getByText(/Hello, (\w+)!/);
    await expect(loc).toBeVisible();
    assert.equal(loc.text(), "Hello, World!");
  });

  it("regex full match on exact line", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    const loc = term.getByText(/Hello, \w+!/, { full: true });
    await expect(loc).toBeVisible();
    assert.equal(loc.text(), "Hello, World!");
  });
});

describe("terminal edge cases", () => {
  it("handles rapid input", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"));
    await expect(term.getByText("ready>")).toBeVisible();
    for (let i = 0; i < 5; i++) {
      term.submit(`msg${i}`);
    }
    await expect(term.getByText("echo: msg4")).toBeVisible();
  });

  it("handles empty submit", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"));
    await expect(term.getByText("ready>")).toBeVisible();
    term.submit("");
    // Empty line echoes as "echo: "
    await expect(term.getByText("echo:")).toBeVisible();
  });

  it("survives child exit", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
    // Child has exited by now; buffer should still be readable
    const buf = term.getBuffer();
    assert.ok(buf.length > 0);
  });

  it("submit quit ends echo", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"));
    await expect(term.getByText("ready>")).toBeVisible();
    term.submit("quit");
    await expect(term.getByText("bye")).toBeVisible();
  });

  it("handles child crash", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("crash.py"));
    // Give it a moment to crash
    await sleep(500);
    const buf = term.getBuffer();
    assert.ok(buf.length > 0);
    // The traceback should be visible
    const text = term._getScreenText();
    assert.ok(
      text.includes("RuntimeError") || text.includes("intentional crash"),
    );
  });

  it("handles large output burst", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("large_output.py"), {
      rows: 30,
      cols: 40,
    });
    await expect(term.getByText("DONE")).toBeVisible({ timeout: 10_000 });
    // The last lines before DONE should be visible in the buffer
    const text = term._getScreenText();
    assert.ok(text.includes("DONE"));
  });

  it("handles unicode output", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("unicode_output.py"), {
      rows: 10,
      cols: 60,
    });
    await expect(term.getByText("UNICODE_DONE")).toBeVisible();
    const text = term._getScreenText();
    assert.ok(text.includes("ASCII: Hello, World!"));
    assert.ok(text.includes("café"));
  });

  it("verifies env propagation", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("env_check.py"), {
      env: { CC_TEST: "present" },
    });
    await expect(term.getByText("ENV_DONE")).toBeVisible();
    await expect(term.getByText("TERM=xterm-256color")).toBeVisible();
    await expect(term.getByText("CC_TEST=present")).toBeVisible();
  });

  it("kill terminates hung process", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    await term.kill();
    assert.equal(term.isAlive, false);
  });

  it("buffer readable after kill", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    await term.kill();
    const buf = term.getBuffer();
    assert.ok(buf.length > 0);
    const text = term._getScreenText();
    assert.ok(text.includes("Running"));
  });

  it("getViewableBuffer matches getBuffer without scrollback", async ({
    terminal,
    fixtureCmd,
  }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
    assert.deepEqual(term.getViewableBuffer(), term.getBuffer());
  });
});

describe("scrollback buffer", () => {
  it("finds text scrolled off viewport", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("stderr_warning.py"), {
      rows: 5,
      cols: 60,
    });
    await expect(term.getByText("STDERR_DONE")).toBeVisible();
    // The Usage line may have scrolled off the 5-row viewport,
    // but getByText searches the full buffer including scrollback
    await expect(term.getByText("Usage: my-tool")).toBeVisible();
  });

  it("scrollback not in viewable buffer", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("stderr_warning.py"), {
      rows: 5,
      cols: 60,
    });
    await expect(term.getByText("STDERR_DONE")).toBeVisible();
    const viewable = term.getViewableBuffer();
    const full = term.getBuffer();
    assert.ok(full.length > viewable.length);
    assert.equal(viewable.length, 5);
  });

  it("snapshot only shows viewport", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("large_output.py"), { rows: 5, cols: 40 });
    await expect(term.getByText("DONE")).toBeVisible({ timeout: 10_000 });
    const snap = term.toSnapshot();
    const lines = snap.split("\n");
    // 1 top border + 5 content + 1 bottom border = 7 lines
    assert.equal(lines.length, 7);
  });

  it("large output searchable in scrollback", async ({
    terminal,
    fixtureCmd,
  }) => {
    const term = terminal(fixtureCmd("large_output.py"), {
      rows: 10,
      cols: 40,
    });
    await expect(term.getByText("DONE")).toBeVisible({ timeout: 10_000 });
    // line-0000 was emitted first and is certainly in scrollback
    await expect(term.getByText("line-0000")).toBeVisible();
    await expect(term.getByText("line-0100")).toBeVisible();
  });
});

describe("suppress stderr", () => {
  it("suppresses stderr warnings", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("stderr_warning.py"), {
      rows: 10,
      cols: 60,
      suppressStderr: true,
    });
    await expect(term.getByText("STDERR_DONE")).toBeVisible();
    const text = term._getScreenText();
    assert.ok(!text.includes("WARNING"));
    await expect(term.getByText("Usage: my-tool")).toBeVisible();
  });
});

describe("snapshot edge cases", () => {
  it("snapshot after input", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("ready>")).toBeVisible();
    term.submit("hello");
    await expect(term.getByText("echo: hello")).toBeVisible();
    const snap = term.toSnapshot();
    assert.ok(snap.includes("echo: hello"));
  });

  it("snapshot with small terminal", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"), { rows: 3, cols: 20 });
    await expect(term.getByText("Hello")).toBeVisible();
    const snap = term.toSnapshot();
    const lines = snap.split("\n");
    // 1 top + 3 content + 1 bottom = 5 lines
    assert.equal(lines.length, 5);
  });

  it("snapshot after resize", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("resize_detect.py"), {
      rows: 10,
      cols: 40,
    });
    await expect(term.getByText("40x10")).toBeVisible();
    const snap1 = term.toSnapshot();
    term.setSize({ rows: 15, cols: 60 });
    await expect(term.getByText("60x15")).toBeVisible();
    const snap2 = term.toSnapshot();
    assert.notEqual(snap1, snap2);
    assert.equal(snap2.split("\n")[0]?.length, 62); // 60 + 2 borders
  });

  it("snapshot contains box borders", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"), { rows: 5, cols: 30 });
    await expect(term.getByText("Hello, World!")).toBeVisible();
    const snap = term.toSnapshot();
    assert.ok(snap.includes("╭")); // top-left corner
    assert.ok(snap.includes("╮")); // top-right corner
    assert.ok(snap.includes("╯")); // bottom-left
    assert.ok(snap.includes("╰")); // bottom-right
    assert.ok(snap.includes("│")); // vertical bar
    assert.ok(snap.includes("─")); // horizontal bar
  });
});
