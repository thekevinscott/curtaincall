/** Snapshot serialization with box-drawing borders. */

import type { Terminal } from "./terminal.js";
import { ljust, rstrip } from "./text.js";

type SnapshotSource = Pick<Terminal, "getViewableBuffer"> & {
  readonly _screen: { readonly cols: number };
};

/**
 * Render the terminal screen as a box-drawn string.
 *
 * Format matches tui-test's visual snapshot style.
 */
export function renderSnapshot(terminal: SnapshotSource): string {
  const buffer = terminal.getViewableBuffer();
  const cols = terminal._screen.cols;

  const top = `╭${"─".repeat(cols)}╮`;
  const bottom = `╯${"─".repeat(cols)}╰`;

  const lines = [top];
  for (const row of buffer) {
    const line = ljust(rstrip(ljust(row.join(""), cols)), cols);
    lines.push(`│${line}│`);
  }
  lines.push(bottom);

  return lines.join("\n");
}
