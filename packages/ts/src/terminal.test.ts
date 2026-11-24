/** Unit tests for Terminal class (mocked PTY). */

import assert from "node:assert/strict";
import xtermHeadless from "@xterm/headless";
import type { IPty } from "node-pty";
import { spawn } from "node-pty";
import { beforeEach, describe, it, vi } from "vitest";
import * as ansi from "./ansi.js";
import { Locator } from "./locator.js";
import { Terminal } from "./terminal.js";
import { TimeoutError } from "./types.js";

vi.mock("node-pty", () => ({ spawn: vi.fn() }));

const mockSpawn = vi.mocked(spawn);

interface FakePty {
  write: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  disposeData: ReturnType<typeof vi.fn>;
  emitData(data: string): void;
  emitExit(exitCode: number, signal?: number): void;
}

function fakePty(): FakePty {
  let onData: ((data: string) => void) | null = null;
  let onExit: ((exit: { exitCode: number; signal?: number }) => void) | null =
    null;
  const disposeData = vi.fn(() => {
    onData = null;
  });
  const pty = {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    disposeData,
    onData: (listener: (data: string) => void) => {
      onData = listener;
      return { dispose: disposeData };
    },
    onExit: (listener: typeof onExit) => {
      onExit = listener;
      return { dispose: vi.fn() };
    },
    emitData: (data: string) => onData?.(data),
    emitExit: (exitCode: number, signal?: number) =>
      onExit?.({ exitCode, signal }),
  };
  mockSpawn.mockReturnValue(pty as unknown as IPty);
  return pty;
}

function makeTerminal(rows = 5, cols = 20): Terminal {
  return new Terminal("echo test", { rows, cols });
}

function started(rows = 5, cols = 20): { term: Terminal; child: FakePty } {
  const child = fakePty();
  const term = makeTerminal(rows, cols);
  term.start();
  return { term, child };
}

async function feedLines(term: Terminal, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await term._feed(`line-${i}\r\n`);
  }
}

beforeEach(() => {
  mockSpawn.mockReset();
});

describe("terminal init", () => {
  it("sets dimensions", () => {
    const term = makeTerminal(24, 80);
    assert.equal(term._rows, 24);
    assert.equal(term._cols, 80);
  });

  it("creates headless xterm screen", () => {
    const term = makeTerminal(10, 40);
    assert.ok(term._screen instanceof xtermHeadless.Terminal);
    assert.equal(term._screen.rows, 10);
    assert.equal(term._screen.cols, 40);
  });

  it("starts not running", () => {
    const term = makeTerminal();
    assert.equal(term._running, false);
    assert.equal(term._child, null);
  });

  it("stores command", () => {
    const term = new Terminal("my command");
    assert.equal(term._command, "my command");
  });

  it("stores env", () => {
    const term = new Terminal("echo", { env: { FOO: "bar" } });
    assert.deepEqual(term._env, { FOO: "bar" });
  });

  it("defaults env to null", () => {
    const term = new Terminal("echo");
    assert.equal(term._env, null);
  });

  it("stores command with suppressStderr", () => {
    const term = new Terminal("my-tool --help", { suppressStderr: true });
    assert.ok(term._command.includes("2>/dev/null"));
    assert.ok(term._command.includes("my-tool --help"));
  });

  it("wraps in bash for suppressStderr", () => {
    const term = new Terminal("my-tool --help", { suppressStderr: true });
    assert.ok(term._command.startsWith("bash -c "));
  });

  it("leaves command unchanged without suppressStderr", () => {
    const term = new Terminal("my-tool --help");
    assert.equal(term._command, "my-tool --help");
  });

  // Node is single-threaded: there is no reader thread and no lock to test.
  it.skip("uses reentrant lock", () => {});
});

describe("terminal start", () => {
  it("spawns child process", () => {
    fakePty();
    const term = makeTerminal(10, 40);
    term.start();

    assert.equal(mockSpawn.mock.calls.length, 1);
    const [file, args, options] = mockSpawn.mock.calls[0] ?? [];
    assert.equal(file, "echo");
    assert.deepEqual(args, ["test"]);
    assert.equal(options?.rows, 10);
    assert.equal(options?.cols, 40);
    assert.equal(term._running, true);
  });

  it("splits a quoted command like a shell would", () => {
    fakePty();
    new Terminal("bash -c 'my-tool --help 2>/dev/null'").start();

    const [file, args] = mockSpawn.mock.calls[0] ?? [];
    assert.equal(file, "bash");
    assert.deepEqual(args, ["-c", "my-tool --help 2>/dev/null"]);
  });

  it("sets term env", () => {
    fakePty();
    const term = new Terminal("echo", { env: { MY_VAR: "123" } });
    term.start();

    const env = mockSpawn.mock.calls[0]?.[2].env;
    assert.equal(env?.TERM, "xterm-256color");
    assert.equal(env?.MY_VAR, "123");
    assert.equal(env?.COLUMNS, "80");
    assert.equal(env?.LINES, "30");
  });
});

describe("terminal write", () => {
  it("sends text to child", () => {
    const { term, child } = started();
    term.write("hello");
    assert.deepEqual(child.write.mock.calls, [["hello"]]);
  });

  it("submit appends enter", () => {
    const { term, child } = started();
    term.submit("cmd");
    assert.deepEqual(child.write.mock.calls, [[`cmd${ansi.ENTER}`]]);
  });

  it("raises without start", () => {
    const term = makeTerminal();
    assert.throws(() => term.write("hello"), /not been started/);
  });
});

describe("terminal key methods", () => {
  it("sends correct escape sequences", () => {
    const { term, child } = started();

    const keyMap = {
      keyUp: ansi.UP,
      keyDown: ansi.DOWN,
      keyLeft: ansi.LEFT,
      keyRight: ansi.RIGHT,
      keyEnter: ansi.ENTER,
      keyBackspace: ansi.BACKSPACE,
      keyDelete: ansi.DELETE,
      keyTab: ansi.TAB,
      keyEscape: ansi.ESCAPE,
      keyCtrlC: ansi.CTRL_C,
      keyCtrlD: ansi.CTRL_D,
    } as const;

    for (const [methodName, expectedSeq] of Object.entries(keyMap)) {
      child.write.mockClear();
      term[methodName as keyof typeof keyMap]();
      assert.deepEqual(child.write.mock.calls, [[expectedSeq]]);
    }
  });
});

describe("terminal click", () => {
  it("sends sgr press then release with 1 based coordinates", () => {
    const { term, child } = started(5, 20);
    term.click(2, 7);
    assert.deepEqual(child.write.mock.calls, [["\x1b[<0;8;3M\x1b[<0;8;3m"]]);
  });

  it("accepts the last viewport cell", () => {
    const { term, child } = started(5, 20);
    term.click(4, 19);
    assert.deepEqual(child.write.mock.calls, [["\x1b[<0;20;5M\x1b[<0;20;5m"]]);
  });

  it("rejects cells outside the viewport", () => {
    const { term, child } = started(5, 20);
    for (const [row, col] of [
      [-1, 0],
      [0, -1],
      [5, 0],
      [0, 20],
    ] as const) {
      assert.throws(
        () => term.click(row, col),
        (err: unknown) => {
          assert.ok(err instanceof RangeError);
          assert.match(err.message, /outside the 5x20 viewport/);
          return true;
        },
      );
    }
    assert.equal(child.write.mock.calls.length, 0);
  });
});

describe("terminal getByText", () => {
  it("returns locator", () => {
    const term = makeTerminal();
    const loc = term.getByText("hello");
    assert.ok(loc instanceof Locator);
  });

  it("passes full flag", () => {
    const term = makeTerminal();
    const loc = term.getByText("hello", { full: true });
    assert.equal(loc._full, true);
  });

  it("accepts regex", () => {
    const pattern = /hello \w+/;
    const term = makeTerminal();
    const loc = term.getByText(pattern);
    assert.equal(loc._text, pattern);
  });
});

describe("terminal getCursor", () => {
  it("returns cursor position", async () => {
    const term = makeTerminal();
    await term._feed("\x1b[4;6H");
    const pos = term.getCursor();
    assert.deepEqual(pos, { x: 5, y: 3 });
  });
});

describe("terminal getBuffer", () => {
  it("returns 2d character list", () => {
    const term = makeTerminal(3, 5);
    const buf = term.getBuffer();
    assert.equal(buf.length, 3);
    assert.ok(buf.every((row) => row.length === 5));
  });

  it("uses spaces for empty cells", () => {
    const term = makeTerminal(2, 5);
    const buf = term.getBuffer();
    for (const row of buf) {
      for (const char of row) {
        assert.equal(char, " ");
      }
    }
  });

  it("reads screen content", async () => {
    const term = makeTerminal(3, 10);
    await term._feed("Hello");
    const buf = term.getBuffer();
    const line = buf[0]?.join("");
    assert.ok(line?.startsWith("Hello"));
  });

  it("includes scrollback lines", async () => {
    const term = makeTerminal(3, 10);
    // Feed enough lines to push content into scrollback
    await feedLines(term, 6);
    const buf = term.getBuffer();
    // Should have scrollback + viewport rows (more than just 3)
    assert.ok(buf.length > 3);
    const fullText = buf.map((row) => row.join("").trimEnd()).join("\n");
    assert.ok(fullText.includes("line-0"));
    assert.ok(fullText.includes("line-5"));
  });
});

// No Python counterpart: pyte composes combining marks; this pins the same text.
describe("terminal combining characters", () => {
  it("composes a base character and its combining mark", async () => {
    const term = makeTerminal(3, 10);
    await term._feed("e\u0301x");
    assert.equal(term._getScreenText().split("\n")[0], "\u00e9x");
    assert.equal(term._getCharAt(0, 0).data, "\u00e9");
  });
});

describe("terminal getViewableBuffer", () => {
  it("returns same as getBuffer without scrollback", () => {
    const term = makeTerminal(3, 5);
    assert.deepEqual(term.getViewableBuffer(), term.getBuffer());
  });

  it("excludes scrollback", async () => {
    const term = makeTerminal(3, 10);
    await feedLines(term, 6);
    const viewable = term.getViewableBuffer();
    assert.equal(viewable.length, 3);
    const full = term.getBuffer();
    assert.ok(full.length > viewable.length);
  });
});

describe("terminal scrollbackLen", () => {
  it("is zero without scrollback", () => {
    const term = makeTerminal(3, 10);
    assert.equal(term._scrollbackLen(), 0);
  });

  it("counts rows scrolled off the viewport", async () => {
    const term = makeTerminal(3, 10);
    await feedLines(term, 6);
    assert.equal(term._scrollbackLen(), term.getBuffer().length - 3);
  });
});

describe("terminal getCharAt", () => {
  it("reads viewport char", async () => {
    const term = makeTerminal(3, 10);
    await term._feed("Hello");
    const char = term._getCharAt(0, 0);
    assert.equal(char.data, "H");
  });

  it("reads scrollback char", async () => {
    const term = makeTerminal(3, 10);
    await feedLines(term, 6);
    // Row 0 should be scrollback line "line-0"
    assert.equal(term._getCharAt(0, 0).data, "l");
    assert.equal(term._getCharAt(0, 5).data, "0");
  });
});

// No Python counterpart: pyte hands back its own Char; these pin the pyte
// colour names and flags this port derives from xterm cells.
describe("terminal getCharAt styles", () => {
  async function styled(sgr: string) {
    const term = makeTerminal(3, 10);
    await term._feed(`\x1b[${sgr}mX\x1b[0m`);
    return term._getCharAt(0, 0);
  }

  it("reports default colours and no flags for plain text", async () => {
    const term = makeTerminal(3, 10);
    await term._feed("X");
    assert.deepEqual(term._getCharAt(0, 0), {
      data: "X",
      fg: "default",
      bg: "default",
      bold: false,
      italic: false,
      underscore: false,
      reverse: false,
    });
  });

  it("names the eight ansi colours as pyte does", async () => {
    const names = [
      "black",
      "red",
      "green",
      "brown",
      "blue",
      "magenta",
      "cyan",
      "white",
    ];
    for (const [i, name] of names.entries()) {
      assert.equal((await styled(`${30 + i}`)).fg, name);
      assert.equal((await styled(`${40 + i}`)).bg, name);
    }
  });

  it("names bright colours", async () => {
    assert.equal((await styled("91")).fg, "brightred");
    assert.equal((await styled("105")).bg, "brightmagenta");
  });

  it("reports 256 colour cube and grayscale entries as hex", async () => {
    assert.equal((await styled("38;5;196")).fg, "ff0000");
    assert.equal((await styled("48;5;21")).bg, "0000ff");
    assert.equal((await styled("38;5;232")).fg, "080808");
  });

  it("reports true colour as hex", async () => {
    assert.equal((await styled("38;2;1;2;255")).fg, "0102ff");
  });

  it("reports style flags", async () => {
    const char = await styled("1;3;4;7");
    assert.equal(char.bold, true);
    assert.equal(char.italic, true);
    assert.equal(char.underscore, true);
    assert.equal(char.reverse, true);
  });
});

describe("terminal isAlive", () => {
  it("returns false when no child", () => {
    const term = makeTerminal();
    assert.equal(term.isAlive, false);
  });

  it("follows the child exit event", () => {
    const { term, child } = started();
    assert.equal(term.isAlive, true);
    child.emitExit(0);
    assert.equal(term.isAlive, false);
  });
});

describe("terminal exitCode", () => {
  it("returns null when no child", () => {
    const term = makeTerminal();
    assert.equal(term.exitCode, null);
  });

  it("returns null when still alive", () => {
    const { term } = started();
    assert.equal(term.exitCode, null);
  });

  it("returns exit status when dead", () => {
    const { term, child } = started();
    child.emitExit(42);
    assert.equal(term.exitCode, 42);
  });

  it("returns null when killed by a signal", () => {
    const { term, child } = started();
    child.emitExit(0, 9);
    assert.equal(term.exitCode, null);
  });
});

describe("terminal wait", () => {
  it("returns exit code when already dead", async () => {
    const { term, child } = started();
    child.emitExit(0);
    assert.equal(await term.wait({ timeout: 1000 }), 0);
  });

  it("raises timeout error", async () => {
    const { term } = started();
    await assert.rejects(term.wait({ timeout: 200 }), (err: unknown) => {
      assert.ok(err instanceof TimeoutError);
      assert.match(err.message, /did not exit/);
      return true;
    });
  });

  it("raises error without start", async () => {
    const term = makeTerminal();
    await assert.rejects(term.wait({ timeout: 100 }), /not been started/);
  });
});

describe("terminal setSize", () => {
  it("resizes screen and pty", () => {
    const { term, child } = started(10, 40);
    term.setSize({ rows: 20, cols: 100 });
    assert.equal(term._rows, 20);
    assert.equal(term._cols, 100);
    assert.equal(term._screen.rows, 20);
    assert.equal(term._screen.cols, 100);
    assert.deepEqual(child.resize.mock.calls, [[100, 20]]);
  });
});

describe("terminal kill", () => {
  it("stops running flag", async () => {
    const { term, child } = started();
    child.emitExit(0);
    await term.kill();
    assert.equal(term._running, false);
  });

  it("terminates alive child", async () => {
    const { term, child } = started();
    child.kill.mockImplementation(() => child.emitExit(0, 1));
    await term.kill();
    assert.deepEqual(child.kill.mock.calls, [["SIGHUP"]]);
  });

  it("escalates to sigkill when the child ignores signals", async () => {
    const { term, child } = started();
    child.kill.mockImplementation((signal: string) => {
      if (signal === "SIGKILL") {
        child.emitExit(0, 9);
      }
    });
    await term.kill();
    assert.deepEqual(child.kill.mock.calls, [
      ["SIGHUP"],
      ["SIGCONT"],
      ["SIGINT"],
      ["SIGKILL"],
    ]);
    assert.equal(term.isAlive, false);
  });

  it("leaves dead child without terminate", async () => {
    const { term, child } = started();
    child.emitExit(0);
    await term.kill();
    assert.equal(child.kill.mock.calls.length, 0);
  });

  it("handles no child", async () => {
    const term = makeTerminal();
    term._running = true;
    await term.kill(); // should not raise
  });

  it("stops listening for output", async () => {
    const { term, child } = started();
    child.emitExit(0);
    await term.kill();
    assert.equal(child.disposeData.mock.calls.length, 1);
  });
});

describe("terminal toSnapshot", () => {
  it("returns string", () => {
    const term = makeTerminal(3, 10);
    const snap = term.toSnapshot();
    assert.equal(typeof snap, "string");
    assert.ok(snap.includes("╭")); // top-left corner
  });

  // Expected string is the output of Python's render_snapshot for the same bytes.
  it("is byte identical to the python snapshot", async () => {
    const term = makeTerminal(3, 12);
    await term._feed(
      "Hello\r\n\u4f60\u597d caf\u00e9 \x1b[31mred\x1b[0m\r\n\u{1F600} end",
    );
    assert.equal(
      term.toSnapshot(),
      [
        "\u256d\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256e",
        "\u2502\u4f60 \u597d  caf\xe9 re\u2502",
        "\u2502d           \u2502",
        "\u2502\u{1f600}  end      \u2502",
        "\u256f\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2570",
      ].join("\n"),
    );
  });
});

describe("terminal getScreenText", () => {
  it("returns string of buffer", async () => {
    const term = makeTerminal(2, 10);
    await term._feed("Hello");
    const text = term._getScreenText();
    assert.ok(text.includes("Hello"));
  });

  it("strips trailing whitespace per row", async () => {
    const term = makeTerminal(2, 20);
    await term._feed("Hi");
    const text = term._getScreenText();
    const lines = text.split("\n");
    assert.equal(lines[0], "Hi");
  });
});

describe("terminal reader", () => {
  it("feeds data to stream", async () => {
    const { term, child } = started(3, 10);
    child.emitData("Hi");
    await term._feed("");

    assert.ok(term._getScreenText().includes("Hi"));
  });

  // Output arrives as events; there is no read call that can time out.
  it.skip("handles timeout", () => {});

  it("stops when killed", async () => {
    const { term, child } = started(3, 10);
    child.emitExit(0);
    await term.kill();
    child.emitData("late");
    await term._feed("");

    assert.ok(!term._getScreenText().includes("late"));
  });

  it("skips empty data", async () => {
    const { term, child } = started(3, 10);
    child.emitData("");
    child.emitData("X");
    await term._feed("");

    assert.ok(term._getScreenText().includes("X"));
  });
});
