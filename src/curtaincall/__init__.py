"""Curtaincall: Testing library for terminal applications."""

from curtaincall.expect import expect
from curtaincall.locator import Locator
from curtaincall.terminal import Terminal
from curtaincall.types import CellStyle, CursorPosition

__all__ = [
    "CellStyle",
    "CursorPosition",
    "Locator",
    "Terminal",
    "expect",
]
