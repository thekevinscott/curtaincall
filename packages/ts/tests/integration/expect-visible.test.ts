/** Integration tests for expect().toBeVisible() and .notToBeVisible(). */

import assert from "node:assert/strict";
import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("expect toBeVisible", () => {
  it("finds text on screen", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
  });

  it("auto waits for delayed output", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("slow_output.py"));
    // "done" appears after ~0.9s of delays
    await expect(term.getByText("done")).toBeVisible({ timeout: 5000 });
  });

  it("raises on timeout with screen dump", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();

    await assert.rejects(
      expect(term.getByText("MISSING")).toBeVisible({ timeout: 500 }),
      (err: unknown) => {
        assert.ok(err instanceof assert.AssertionError);
        assert.match(err.message, /MISSING/);
        // Error message should include the screen content
        assert.ok(err.message.includes("Hello, World!"));
        return true;
      },
    );
  });
});

describe("expect notToBeVisible", () => {
  it("passes for absent text", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();
    await expect(term.getByText("MISSING")).notToBeVisible();
  });

  it("raises when text is present", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("hello.py"));
    await expect(term.getByText("Hello, World!")).toBeVisible();

    await assert.rejects(
      expect(term.getByText("Hello, World!")).notToBeVisible({ timeout: 500 }),
      assert.AssertionError,
    );
  });
});
