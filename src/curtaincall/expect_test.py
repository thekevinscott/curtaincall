"""Unit tests for expect() polling, color matching, and assertion classes."""

from unittest.mock import MagicMock

import pytest

from curtaincall.expect import (
    LocatorAssertions,
    TerminalAssertions,
    _color_matches,
    _normalize_color,
    _poll,
    _poll_negative,
    expect,
)


def describe_normalize_color():

    def it_lowercases():
        assert _normalize_color("RED") == "red"

    def it_strips_whitespace():
        assert _normalize_color("  red  ") == "red"


def describe_color_matches():

    def it_matches_exact_color():
        assert _color_matches("red", "red")

    def it_is_case_insensitive():
        assert _color_matches("Red", "red")
        assert _color_matches("RED", "red")

    def it_matches_alias_darkred_to_red():
        assert _color_matches("darkred", "red")

    def it_matches_alias_darkgreen_to_green():
        assert _color_matches("darkgreen", "green")

    def it_matches_alias_brown_to_yellow():
        assert _color_matches("brown", "yellow")

    def it_matches_alias_darkcyan_to_cyan():
        assert _color_matches("darkcyan", "cyan")

    def it_matches_alias_darkmagenta_to_magenta():
        assert _color_matches("darkmagenta", "magenta")

    def it_matches_alias_darkblue_to_blue():
        assert _color_matches("darkblue", "blue")

    def it_matches_alias_lightgray_to_white():
        assert _color_matches("lightgray", "white")

    def it_rejects_mismatched_colors():
        assert not _color_matches("red", "green")
        assert not _color_matches("blue", "red")

    def it_matches_default_color():
        assert _color_matches("default", "default")

    def it_rejects_unknown_expected_with_no_alias():
        assert not _color_matches("red", "unknown_color")

    def it_matches_black():
        assert _color_matches("black", "black")


def describe_poll():

    def it_returns_immediately_when_check_passes():
        _poll(lambda: True, timeout=1.0)

    def it_raises_on_timeout():
        with pytest.raises(AssertionError, match="timed out"):
            _poll(lambda: False, timeout=0.2, failure_message="timed out")

    def it_includes_screen_in_error():
        with pytest.raises(AssertionError, match="screen content here"):
            _poll(
                lambda: False,
                timeout=0.2,
                failure_message="fail",
                screen_fn=lambda: "screen content here",
            )

    def it_does_not_include_screen_when_no_screen_fn():
        with pytest.raises(AssertionError) as exc_info:
            _poll(lambda: False, timeout=0.2, failure_message="just fail")
        assert "Screen content" not in str(exc_info.value)

    def it_waits_for_condition_to_become_true():
        state = {"count": 0}

        def check():
            state["count"] += 1
            return state["count"] >= 3

        _poll(check, timeout=2.0, interval=0.05)
        assert state["count"] >= 3

    def it_respects_custom_interval():
        state = {"count": 0}

        def check():
            state["count"] += 1
            return state["count"] >= 2

        _poll(check, timeout=2.0, interval=0.01)
        assert state["count"] >= 2


def describe_poll_negative():

    def it_returns_immediately_when_check_is_false():
        _poll_negative(lambda: False, timeout=1.0)

    def it_raises_when_check_stays_true():
        with pytest.raises(AssertionError):
            _poll_negative(lambda: True, timeout=0.2, failure_message="still visible")

    def it_includes_screen_in_error():
        with pytest.raises(AssertionError, match="screen dump"):
            _poll_negative(
                lambda: True,
                timeout=0.2,
                failure_message="fail",
                screen_fn=lambda: "screen dump",
            )

    def it_waits_for_condition_to_become_false():
        state = {"count": 0}

        def check():
            state["count"] += 1
            return state["count"] < 3

        _poll_negative(check, timeout=2.0, interval=0.05)
        assert state["count"] >= 3


def _mock_locator(*, visible: bool = True, text: str = "test"):
    """Create a mock locator."""
    loc = MagicMock()
    loc.is_visible.return_value = visible
    loc._text = text
    loc._terminal = MagicMock()
    loc._terminal._get_screen_text.return_value = "mock screen"
    return loc


def describe_locator_assertions():

    def it_to_be_visible_passes_when_visible():
        loc = _mock_locator(visible=True)
        assertions = LocatorAssertions(loc)
        assertions.to_be_visible(timeout=0.5)

    def it_to_be_visible_raises_when_not_visible():
        loc = _mock_locator(visible=False, text="MISSING")
        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError, match="MISSING"):
            assertions.to_be_visible(timeout=0.2)

    def it_not_to_be_visible_passes_when_not_visible():
        loc = _mock_locator(visible=False)
        assertions = LocatorAssertions(loc)
        assertions.not_to_be_visible(timeout=0.5)

    def it_not_to_be_visible_raises_when_visible():
        loc = _mock_locator(visible=True, text="PRESENT")
        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError, match="PRESENT"):
            assertions.not_to_be_visible(timeout=0.2)

    def it_to_contain_text_passes():
        loc = _mock_locator(text="Hello World")
        loc.text.return_value = "Hello World"
        assertions = LocatorAssertions(loc)
        assertions.to_contain_text("World", timeout=0.5)

    def it_to_contain_text_raises_on_mismatch():
        loc = _mock_locator(text="Hello")
        loc.text.return_value = "Hello"
        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError):
            assertions.to_contain_text("NOPE", timeout=0.2)

    def it_to_have_fg_color_passes():
        loc = MagicMock()
        cell = MagicMock()
        cell.row = 0
        cell.col = 0
        loc.cells = [cell]
        loc._text = "E"
        loc._terminal = MagicMock()
        loc._terminal._get_screen_text.return_value = ""

        char_mock = MagicMock()
        char_mock.fg = "red"
        loc._terminal._get_char_at.return_value = char_mock

        assertions = LocatorAssertions(loc)
        assertions.to_have_fg_color("red", timeout=0.5)

    def it_to_have_fg_color_raises_on_mismatch():
        loc = MagicMock()
        cell = MagicMock()
        cell.row = 0
        cell.col = 0
        loc.cells = [cell]
        loc._text = "E"
        loc._terminal = MagicMock()
        loc._terminal._get_screen_text.return_value = ""

        char_mock = MagicMock()
        char_mock.fg = "red"
        loc._terminal._get_char_at.return_value = char_mock

        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError):
            assertions.to_have_fg_color("green", timeout=0.2)

    def it_to_have_fg_color_fails_when_no_cells():
        loc = MagicMock()
        loc.cells = []
        loc._text = "MISSING"
        loc._terminal = MagicMock()
        loc._terminal._get_screen_text.return_value = ""

        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError):
            assertions.to_have_fg_color("red", timeout=0.2)

    def it_to_have_bg_color_passes():
        loc = MagicMock()
        cell = MagicMock()
        cell.row = 0
        cell.col = 0
        loc.cells = [cell]
        loc._text = "H"
        loc._terminal = MagicMock()
        loc._terminal._get_screen_text.return_value = ""

        char_mock = MagicMock()
        char_mock.bg = "blue"
        loc._terminal._get_char_at.return_value = char_mock

        assertions = LocatorAssertions(loc)
        assertions.to_have_bg_color("blue", timeout=0.5)

    def it_to_have_bg_color_raises_on_mismatch():
        loc = MagicMock()
        cell = MagicMock()
        cell.row = 0
        cell.col = 0
        loc.cells = [cell]
        loc._text = "H"
        loc._terminal = MagicMock()
        loc._terminal._get_screen_text.return_value = ""

        char_mock = MagicMock()
        char_mock.bg = "blue"
        loc._terminal._get_char_at.return_value = char_mock

        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError):
            assertions.to_have_bg_color("red", timeout=0.2)

    def it_to_have_bg_color_fails_when_no_cells():
        loc = MagicMock()
        loc.cells = []
        loc._text = "MISSING"
        loc._terminal = MagicMock()
        loc._terminal._get_screen_text.return_value = ""

        assertions = LocatorAssertions(loc)
        with pytest.raises(AssertionError):
            assertions.to_have_bg_color("red", timeout=0.2)


def describe_terminal_assertions():

    def it_returns_snapshot():
        mock_terminal = MagicMock()
        mock_terminal.to_snapshot.return_value = "snapshot string"
        assertions = TerminalAssertions(mock_terminal)
        assert assertions.to_match_snapshot() == "snapshot string"


def describe_expect_function():

    def it_returns_locator_assertions_for_locator():
        from curtaincall.locator import Locator

        mock_terminal = MagicMock()
        loc = Locator(mock_terminal, "test")
        result = expect(loc)
        assert isinstance(result, LocatorAssertions)

    def it_returns_terminal_assertions_for_terminal():
        from curtaincall.terminal import Terminal

        term = Terminal("echo test")
        result = expect(term)
        assert isinstance(result, TerminalAssertions)

    def it_raises_for_invalid_type():
        with pytest.raises(TypeError, match="expect\\(\\) requires"):
            expect("not a locator")  # type: ignore[arg-type]
