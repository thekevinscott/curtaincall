"""Locator for finding text on the terminal screen."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from curtaincall.terminal import Terminal


@dataclass(frozen=True)
class CellMatch:
    """A matched cell position on the screen."""

    row: int
    col: int


class Locator:
    """Lazy locator that finds text on a terminal screen.

    Created by Terminal.get_by_text(). Doesn't search until properties
    are accessed or the locator is passed to expect().
    """

    def __init__(
        self,
        terminal: Terminal,
        text: str | re.Pattern[str],
        *,
        full: bool = False,
    ) -> None:
        self._terminal = terminal
        self._text = text
        self._full = full

    @property
    def cells(self) -> list[CellMatch]:
        """Find all matching cell positions on the screen."""
        buffer = self._terminal.get_buffer()
        matches: list[CellMatch] = []

        for row_idx, row in enumerate(buffer):
            line = "".join(row)
            if self._full:
                self._match_full_line(line, row_idx, matches)
            else:
                self._match_substring(line, row_idx, matches)

        return matches

    def _match_full_line(self, line: str, row_idx: int, matches: list[CellMatch]) -> None:
        stripped = line.strip()
        offset = len(line) - len(line.lstrip())

        if isinstance(self._text, re.Pattern):
            if self._text.fullmatch(stripped):
                for col_idx in range(len(stripped)):
                    matches.append(CellMatch(row=row_idx, col=offset + col_idx))
        elif stripped == self._text:
            for col_idx in range(len(self._text)):
                matches.append(CellMatch(row=row_idx, col=offset + col_idx))

    def _match_substring(self, line: str, row_idx: int, matches: list[CellMatch]) -> None:
        if isinstance(self._text, re.Pattern):
            for m in self._text.finditer(line):
                for col_idx in range(m.start(), m.end()):
                    matches.append(CellMatch(row=row_idx, col=col_idx))
        else:
            start = 0
            while True:
                idx = line.find(self._text, start)
                if idx == -1:
                    break
                for col_idx in range(idx, idx + len(self._text)):
                    matches.append(CellMatch(row=row_idx, col=col_idx))
                start = idx + 1

    def is_visible(self) -> bool:
        """Check if the text is currently visible on screen (no waiting)."""
        return len(self.cells) > 0

    def text(self) -> str:
        """Return the matched text content."""
        if isinstance(self._text, re.Pattern):
            buffer = self._terminal.get_buffer()
            for row in buffer:
                line = "".join(row)
                m = self._text.fullmatch(line.strip()) if self._full else self._text.search(line)
                if m:
                    return m.group()
            return ""
        return self._text
