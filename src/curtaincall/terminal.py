"""Terminal session management with PTY and VT100 emulation."""

from __future__ import annotations

import os
import re
import shlex
import threading
from typing import TYPE_CHECKING

import pexpect
import pyte

from curtaincall import ansi
from curtaincall.locator import Locator
from curtaincall.snapshot import render_snapshot
from curtaincall.types import CursorPosition

if TYPE_CHECKING:
    pass


class Terminal:
    """A terminal session backed by a real PTY and VT100 emulator.

    Spawns the given command in a pseudo-terminal, reads its output in a
    background thread, and feeds it through pyte for accurate screen state.

    Uses pyte.HistoryScreen for scrollback buffer support so that content
    scrolled off the visible viewport is still searchable by locators.
    """

    def __init__(
        self,
        command: str,
        *,
        rows: int = 30,
        cols: int = 80,
        env: dict[str, str] | None = None,
        history: int = 1000,
        suppress_stderr: bool = False,
    ) -> None:
        if suppress_stderr:
            self._command = f"bash -c {shlex.quote(command + ' 2>/dev/null')}"
        else:
            self._command = command
        self._rows = rows
        self._cols = cols
        self._env = env

        self._screen: pyte.HistoryScreen = pyte.HistoryScreen(
            cols, rows, history=history,
        )
        self._stream = pyte.ByteStream(self._screen)
        self._child: pexpect.spawn | None = None
        self._reader_thread: threading.Thread | None = None
        self._lock = threading.RLock()
        self._running = False

    def start(self) -> None:
        """Spawn the child process and start reading its output."""
        spawn_env = os.environ.copy()
        spawn_env["TERM"] = "xterm-256color"
        spawn_env["COLUMNS"] = str(self._cols)
        spawn_env["LINES"] = str(self._rows)
        if self._env:
            spawn_env.update(self._env)

        self._child = pexpect.spawn(
            self._command,
            dimensions=(self._rows, self._cols),
            env=spawn_env,
            encoding=None,  # binary mode
        )
        self._running = True
        self._reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self._reader_thread.start()

    def _reader_loop(self) -> None:
        """Background loop: read PTY output and feed it to the VT100 emulator."""
        assert self._child is not None
        while self._running:
            try:
                data = self._child.read_nonblocking(4096, timeout=0.05)
                if data:
                    with self._lock:
                        self._stream.feed(data)
            except pexpect.TIMEOUT:
                continue
            except pexpect.EOF:
                break

    # -- Input methods --

    def write(self, text: str) -> None:
        """Send raw text to the PTY."""
        assert self._child is not None
        self._child.send(text)

    def submit(self, text: str) -> None:
        """Send text followed by Enter."""
        self.write(text + ansi.ENTER)

    def key_up(self) -> None:
        self.write(ansi.UP)

    def key_down(self) -> None:
        self.write(ansi.DOWN)

    def key_left(self) -> None:
        self.write(ansi.LEFT)

    def key_right(self) -> None:
        self.write(ansi.RIGHT)

    def key_enter(self) -> None:
        self.write(ansi.ENTER)

    def key_backspace(self) -> None:
        self.write(ansi.BACKSPACE)

    def key_delete(self) -> None:
        self.write(ansi.DELETE)

    def key_tab(self) -> None:
        self.write(ansi.TAB)

    def key_escape(self) -> None:
        self.write(ansi.ESCAPE)

    def key_ctrl_c(self) -> None:
        self.write(ansi.CTRL_C)

    def key_ctrl_d(self) -> None:
        self.write(ansi.CTRL_D)

    # -- Query methods --

    def get_by_text(
        self,
        text: str | re.Pattern[str],
        *,
        full: bool = False,
    ) -> Locator:
        """Create a locator that matches text on the screen.

        Args:
            text: String or compiled regex to search for.
            full: If True, match the entire line (stripped) instead of substring.

        Returns:
            A Locator instance (lazy -- doesn't search until used).
        """
        return Locator(terminal=self, text=text, full=full)

    def get_cursor(self) -> CursorPosition:
        """Return the current cursor position."""
        with self._lock:
            return CursorPosition(x=self._screen.cursor.x, y=self._screen.cursor.y)

    def get_buffer(self) -> list[list[str]]:
        """Return the full buffer (scrollback + viewport) as a 2D list of characters.

        Scrollback lines come first (oldest at index 0), followed by
        the visible viewport rows.  This means ``get_by_text()`` and
        other locator searches will find text that has scrolled off the
        top of the screen.
        """
        with self._lock:
            cols = self._screen.columns
            result: list[list[str]] = []

            # Scrollback lines (oldest first)
            for line in self._screen.history.top:
                row = []
                for x in range(cols):
                    char = line[x]
                    row.append(char.data if char.data else " ")
                result.append(row)

            # Visible viewport
            for y in range(self._screen.lines):
                row = []
                for x in range(cols):
                    char = self._screen.buffer[y][x]
                    row.append(char.data if char.data else " ")
                result.append(row)
            return result

    def get_viewable_buffer(self) -> list[list[str]]:
        """Return the visible viewport only (no scrollback)."""
        with self._lock:
            cols = self._screen.columns
            result: list[list[str]] = []
            for y in range(self._screen.lines):
                row = []
                for x in range(cols):
                    char = self._screen.buffer[y][x]
                    row.append(char.data if char.data else " ")
                result.append(row)
            return result

    def _get_char_at(self, row: int, col: int) -> pyte.screens.Char:
        """Get the Char at a position in the full buffer coordinate system.

        Row 0 is the oldest scrollback line.  Rows after
        ``len(history.top)`` are viewport rows.
        """
        with self._lock:
            scrollback_count = len(self._screen.history.top)
            if row < scrollback_count:
                return self._screen.history.top[row][col]
            return self._screen.buffer[row - scrollback_count][col]

    # -- Terminal control --

    def set_size(self, *, rows: int, cols: int) -> None:
        """Resize the terminal."""
        assert self._child is not None
        self._rows = rows
        self._cols = cols
        with self._lock:
            self._screen.resize(rows, cols)
        self._child.setwinsize(rows, cols)

    def kill(self) -> None:
        """Terminate the child process and stop the reader thread."""
        self._running = False
        if self._child is not None:
            if self._child.isalive():
                self._child.terminate(force=True)
            self._child.close()
        if self._reader_thread is not None:
            self._reader_thread.join(timeout=2.0)

    def to_snapshot(self) -> str:
        """Render the current screen as a box-drawn snapshot string."""
        with self._lock:
            return render_snapshot(self)

    def _get_screen_text(self) -> str:
        """Return the full buffer content (scrollback + viewport) as a string."""
        buf = self.get_buffer()
        return "\n".join("".join(row).rstrip() for row in buf)
