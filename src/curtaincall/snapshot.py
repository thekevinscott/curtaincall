"""Snapshot serialization with box-drawing borders."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from curtaincall.terminal import Terminal


def render_snapshot(terminal: Terminal) -> str:
    """Render the terminal screen as a box-drawn string.

    Format matches tui-test's visual snapshot style:

        +----------------------------------+
        |$ echo hello                      |
        |hello                             |
        |$                                 |
        |                                  |
        +----------------------------------+
    """
    buffer = terminal.get_viewable_buffer()
    cols = terminal._screen.columns

    top = "\u256d" + "\u2500" * cols + "\u256e"
    bottom = "\u256f" + "\u2500" * cols + "\u2570"

    lines = [top]
    for row in buffer:
        content = "".join(row)
        # Right-pad to full width, then rstrip for clean diffs
        padded = content.ljust(cols)
        rstripped = padded.rstrip()
        # Re-pad so the closing border aligns
        line = rstripped.ljust(cols)
        lines.append("\u2502" + line + "\u2502")
    lines.append(bottom)

    return "\n".join(lines)
