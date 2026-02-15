"""Curtaincall: Testing library for terminal applications."""

from importlib.metadata import version as _version

from curtaincall.expect import expect
from curtaincall.locator import Locator
from curtaincall.terminal import Terminal
from curtaincall.types import CellStyle, CursorPosition

__version__ = _version("curtaincall")

__all__ = [
    "CellStyle",
    "CursorPosition",
    "Locator",
    "Terminal",
    "__version__",
    "expect",
]
