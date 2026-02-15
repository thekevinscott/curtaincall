"""Core data types for curtaincall."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CursorPosition:
    """Cursor position on the terminal screen."""

    x: int
    y: int


@dataclass(frozen=True)
class CellStyle:
    """Style information for a terminal cell."""

    fg: str
    bg: str
    bold: bool = False
    italic: bool = False
    underscore: bool = False
    reverse: bool = False
