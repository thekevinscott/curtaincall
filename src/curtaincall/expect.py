"""expect() with auto-waiting assertions."""

from __future__ import annotations

import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from curtaincall.locator import Locator
    from curtaincall.terminal import Terminal

# pyte color name mapping (pyte uses lowercase color names)
_COLOR_ALIASES: dict[str, set[str]] = {
    "red": {"red", "darkred"},
    "green": {"green", "darkgreen"},
    "blue": {"blue", "darkblue"},
    "yellow": {"yellow", "brown"},
    "cyan": {"cyan", "darkcyan"},
    "magenta": {"magenta", "darkmagenta"},
    "white": {"white", "lightgray"},
    "black": {"black"},
    "default": {"default"},
}


def _normalize_color(color: str) -> str:
    """Normalize a color name to lowercase."""
    return color.lower().strip()


def _color_matches(actual: str, expected: str) -> bool:
    """Check if an actual pyte color matches the expected color name."""
    actual_lower = actual.lower()
    expected_lower = expected.lower()

    # Direct match
    if actual_lower == expected_lower:
        return True

    # Check aliases
    aliases = _COLOR_ALIASES.get(expected_lower, set())
    return actual_lower in aliases


def _poll(
    check_fn: callable,
    timeout: float,
    interval: float = 0.1,
    failure_message: str = "",
    screen_fn: callable | None = None,
) -> None:
    """Poll until check_fn() returns True or timeout expires."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if check_fn():
            return
        time.sleep(interval)

    # Build failure message with screen dump
    msg = failure_message
    if screen_fn:
        msg += f"\n\nScreen content:\n{screen_fn()}"
    raise AssertionError(msg)


def _poll_negative(
    check_fn: callable,
    timeout: float,
    interval: float = 0.1,
    failure_message: str = "",
    screen_fn: callable | None = None,
) -> None:
    """Poll until check_fn() returns False or timeout expires."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not check_fn():
            return
        time.sleep(interval)

    msg = failure_message
    if screen_fn:
        msg += f"\n\nScreen content:\n{screen_fn()}"
    raise AssertionError(msg)


class LocatorAssertions:
    """Assertions on a Locator with auto-waiting."""

    def __init__(self, locator: Locator) -> None:
        self._locator = locator

    def to_be_visible(self, *, timeout: float = 5.0) -> None:
        """Assert the locator's text is visible on screen."""
        _poll(
            check_fn=self._locator.is_visible,
            timeout=timeout,
            failure_message=f"Expected text to be visible: {self._locator._text!r}",
            screen_fn=self._locator._terminal._get_screen_text,
        )

    def not_to_be_visible(self, *, timeout: float = 5.0) -> None:
        """Assert the locator's text is NOT visible on screen."""
        _poll_negative(
            check_fn=self._locator.is_visible,
            timeout=timeout,
            failure_message=f"Expected text NOT to be visible: {self._locator._text!r}",
            screen_fn=self._locator._terminal._get_screen_text,
        )

    def to_have_fg_color(self, color: str, *, timeout: float = 5.0) -> None:
        """Assert the matched text has the expected foreground color."""

        def check() -> bool:
            cells = self._locator.cells
            if not cells:
                return False
            screen = self._locator._terminal._screen
            for cell in cells:
                char = screen.buffer[cell.row][cell.col]
                if not _color_matches(char.fg, color):
                    return False
            return True

        _poll(
            check_fn=check,
            timeout=timeout,
            failure_message=f"Expected text {self._locator._text!r} to have fg color {color!r}",
            screen_fn=self._locator._terminal._get_screen_text,
        )

    def to_have_bg_color(self, color: str, *, timeout: float = 5.0) -> None:
        """Assert the matched text has the expected background color."""

        def check() -> bool:
            cells = self._locator.cells
            if not cells:
                return False
            screen = self._locator._terminal._screen
            for cell in cells:
                char = screen.buffer[cell.row][cell.col]
                if not _color_matches(char.bg, color):
                    return False
            return True

        _poll(
            check_fn=check,
            timeout=timeout,
            failure_message=f"Expected text {self._locator._text!r} to have bg color {color!r}",
            screen_fn=self._locator._terminal._get_screen_text,
        )

    def to_contain_text(self, text: str, *, timeout: float = 5.0) -> None:
        """Assert the matched text contains the given substring."""

        def check() -> bool:
            matched = self._locator.text()
            return text in matched

        _poll(
            check_fn=check,
            timeout=timeout,
            failure_message=f"Expected locator to contain text {text!r}",
            screen_fn=self._locator._terminal._get_screen_text,
        )


class TerminalAssertions:
    """Assertions on a Terminal with auto-waiting."""

    def __init__(self, terminal: Terminal) -> None:
        self._terminal = terminal

    def to_match_snapshot(self) -> str:
        """Return the terminal snapshot for comparison."""
        return self._terminal.to_snapshot()


def expect(target: Locator | Terminal) -> LocatorAssertions | TerminalAssertions:
    """Create assertions on a locator or terminal.

    Usage:
        expect(term.get_by_text("Hello")).to_be_visible()
        expect(term).to_match_snapshot()
    """
    from curtaincall.locator import Locator
    from curtaincall.terminal import Terminal

    if isinstance(target, Locator):
        return LocatorAssertions(target)
    if isinstance(target, Terminal):
        return TerminalAssertions(target)
    raise TypeError(f"expect() requires a Locator or Terminal, got {type(target).__name__}")
