/** Integration tests for Terminal lifecycle: spawn, read, cleanup. */

import assert from "node:assert/strict";
import { describe } from "vitest";
import { TimeoutError, expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("terminal lifecycle", () => {
  it("reads output from spawned process", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
  });

  it("cleans up child process on kill", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    await term.kill();
    assert.equal(term.isAlive, false);
  });

  it("respects custom dimensions", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"), { rows: 24, cols: 40 });
    await expect(term.getByText("Hello, World!")).toBeVisible();
    const buf = term.getBuffer();
    assert.equal(buf.length, 24);
    assert.ok(buf.every((row) => row.length === 40));
  });

  it("passes custom env to child", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"), {
      env: { CC_TEST: "present" },
    });
    await expect(term.getByText("Hello, World!")).toBeVisible();
  });

  it("handles immediate exit", ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 0`);
    // Should not hang or raise -- just verify we can read the buffer
    const buf = term.getBuffer();
    assert.ok(buf.length > 0);
  });

  it("handles nonzero exit", ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 1`);
    const buf = term.getBuffer();
    assert.ok(buf.length > 0);
  });
});

describe("exit code", () => {
  it("captures zero exit code", async ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 0`);
    await term.wait({ timeout: 5000 });
    assert.equal(term.exitCode, 0);
  });

  it("captures nonzero exit code", async ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 42`);
    await term.wait({ timeout: 5000 });
    assert.equal(term.exitCode, 42);
  });

  it("captures exit code 1", async ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 1`);
    await term.wait({ timeout: 5000 });
    assert.equal(term.exitCode, 1);
  });

  it("exit code is null while running", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    assert.equal(term.exitCode, null);
  });
});

describe("wait", () => {
  it("wait returns exit code", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    const code = await term.wait({ timeout: 5000 });
    assert.equal(code, 0);
  });

  it("wait timeout on long running process", async ({
    terminal,
    fixtureCmd,
  }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    await assert.rejects(term.wait({ timeout: 500 }), TimeoutError);
  });
});

describe("isAlive", () => {
  it("is alive while running", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    assert.equal(term.isAlive, true);
  });

  it("is not alive after exit", async ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 0`);
    await term.wait({ timeout: 5000 });
    assert.equal(term.isAlive, false);
  });
});

describe("toHaveExited", () => {
  it("asserts process exited", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term).toHaveExited({ timeout: 5000 });
    assert.equal(term.exitCode, 0);
  });

  it("asserts process exited with code", async ({ terminal, fixtureCmd }) => {
    const term = terminal(`${fixtureCmd("exit_code.py")} 2`);
    await expect(term).toHaveExited({ timeout: 5000 });
    assert.equal(term.exitCode, 2);
  });

  it("fails when process still running", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    await assert.rejects(
      expect(term).toHaveExited({ timeout: 500 }),
      (err: unknown) => {
        assert.ok(err instanceof assert.AssertionError);
        assert.match(err.message, /Expected process to have exited/);
        return true;
      },
    );
  });
});
