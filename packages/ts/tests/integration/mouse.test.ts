/** Integration tests for mouse click input. */

import { describe } from "vitest";
import { expect } from "../../src/index.js";
import { it } from "../conftest.js";

describe("terminal click", () => {
  it("clicks a viewport cell", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("mouse_click.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("ready")).toBeVisible();
    term.click(2, 10);
    await expect(term.getByText("Clicked: Alpha (button 0)")).toBeVisible();
  });

  it("misses when cell is empty", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("mouse_click.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("ready")).toBeVisible();
    term.click(2, 9);
    await expect(term.getByText("Clicked: none")).toBeVisible();
  });
});

describe("locator click", () => {
  it("clicks matched text", async ({ terminal, fixtureCmd }) => {
    const term = terminal(fixtureCmd("mouse_click.py"), { rows: 10, cols: 40 });
    await expect(term.getByText("ready")).toBeVisible();
    term.getByText("Beta").click();
    await expect(term.getByText("Clicked: Beta (button 0)")).toBeVisible();
  });

  it("clicks the viewport match when scrollback has earlier matches", async ({
    terminal,
    fixtureCmd,
  }) => {
    const term = terminal(`${fixtureCmd("mouse_click.py")} 25`, {
      rows: 10,
      cols: 40,
    });
    await expect(term.getByText("ready")).toBeVisible();
    await expect(term.getByText("Beta filler 0")).toBeVisible();
    term.getByText("Beta").click();
    await expect(term.getByText("Clicked: Beta (button 0)")).toBeVisible();
  });
});
