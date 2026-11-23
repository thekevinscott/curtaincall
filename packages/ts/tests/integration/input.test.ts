/** Integration tests for Terminal input methods. */

import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("terminal input", () => {
  it("submits text and reads echo", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"));
    await expect(term.getByText("ready>")).toBeVisible();
    term.submit("hello world");
    await expect(term.getByText("echo: hello world")).toBeVisible();
  });

  it("handles multiple submits", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("echo.py"));
    await expect(term.getByText("ready>")).toBeVisible();
    term.submit("first");
    await expect(term.getByText("echo: first")).toBeVisible();
    term.submit("second");
    await expect(term.getByText("echo: second")).toBeVisible();
  });

  it("sends ctrl c to signal handler", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("signal_handler.py"));
    await expect(term.getByText("Running")).toBeVisible();
    term.keyCtrlC();
    await expect(term.getByText("Cleanup")).toBeVisible();
  });

  it("navigates arrow menu", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("arrow_menu.py"), { rows: 24, cols: 80 });
    await expect(term.getByText("Select an option:")).toBeVisible();
    term.keyDown();
    term.keyDown();
    term.keyEnter();
    await expect(term.getByText("Selected: Option C")).toBeVisible();
  });
});
