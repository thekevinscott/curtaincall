/** Unit tests for the vitest fixture factory. */

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import { Terminal } from "./terminal.js";
import { createTerminalFactory } from "./vitest.js";

vi.mock("./terminal.js", () => ({ Terminal: vi.fn() }));

const MockTerminal = vi.mocked(Terminal);

function mockTerm(): Terminal {
  return { start: vi.fn() } as unknown as Terminal;
}

function queue(...terms: Terminal[]): void {
  for (const term of terms) {
    // biome-ignore lint/complexity/useArrowFunction: the mock is called with `new`
    MockTerminal.mockImplementationOnce(function () {
      return term;
    } as unknown as () => Terminal);
  }
}

describe("terminal factory", () => {
  beforeEach(() => {
    MockTerminal.mockReset();
  });

  it("creates terminal with defaults", () => {
    const term = mockTerm();
    queue(term);
    const terminals: Terminal[] = [];

    const factory = createTerminalFactory(terminals);
    const result = factory("my command");

    assert.deepEqual(MockTerminal.mock.calls, [
      [
        "my command",
        {
          rows: 30,
          cols: 80,
          env: undefined,
          history: 1000,
          suppressStderr: false,
        },
      ],
    ]);
    assert.equal(vi.mocked(term.start).mock.calls.length, 1);
    assert.equal(result, term);
    assert.deepEqual(terminals, [term]);
  });

  it("passes custom args", () => {
    queue(mockTerm());
    const terminals: Terminal[] = [];

    const factory = createTerminalFactory(terminals);
    factory("cmd", { rows: 24, cols: 120, env: { A: "B" } });

    assert.deepEqual(MockTerminal.mock.calls, [
      [
        "cmd",
        {
          rows: 24,
          cols: 120,
          env: { A: "B" },
          history: 1000,
          suppressStderr: false,
        },
      ],
    ]);
  });

  it("tracks multiple terminals", () => {
    const terms = [mockTerm(), mockTerm(), mockTerm()];
    queue(...terms);
    const terminals: Terminal[] = [];

    const factory = createTerminalFactory(terminals);
    factory("cmd1");
    factory("cmd2");
    factory("cmd3");

    assert.equal(terminals.length, 3);
    for (const t of terms) {
      assert.equal(vi.mocked(t.start).mock.calls.length, 1);
    }
  });

  it("creates empty terminals list", () => {
    const terminals: Terminal[] = [];
    const factory = createTerminalFactory(terminals);
    assert.equal(typeof factory, "function");
    assert.deepEqual(terminals, []);
  });
});
