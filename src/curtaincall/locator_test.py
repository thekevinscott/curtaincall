"""Unit tests for Locator text matching logic."""

import re
from unittest.mock import MagicMock

import pytest

from curtaincall.locator import Locator


def _mock_terminal(lines: list[str], cols: int = 80) -> MagicMock:
    """Create a mock terminal with a fixed buffer."""
    term = MagicMock()
    buffer = []
    for line in lines:
        row = list(line.ljust(cols))
        buffer.append(row)
    term.get_buffer.return_value = buffer
    term._scrollback_len.return_value = 0
    return term


def describe_locator_substring_match():

    def it_finds_substring_in_line():
        term = _mock_terminal(["Hello, World!", "second line"])
        loc = Locator(term, "World")
        assert loc.is_visible()
        assert len(loc.cells) == 5  # W, o, r, l, d

    def it_returns_correct_cell_positions():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, "World")
        cells = loc.cells
        assert cells[0].row == 0
        assert cells[0].col == 7  # "Hello, " is 7 chars

    def it_returns_empty_for_missing_text():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, "MISSING")
        assert not loc.is_visible()
        assert len(loc.cells) == 0

    def it_finds_multiple_occurrences():
        term = _mock_terminal(["aa bb aa"])
        loc = Locator(term, "aa")
        cells = loc.cells
        # Two occurrences, 2 cells each
        assert len(cells) == 4

    def it_finds_across_multiple_rows():
        term = _mock_terminal(["first Hello", "second Hello"])
        loc = Locator(term, "Hello")
        cells = loc.cells
        rows = {c.row for c in cells}
        assert rows == {0, 1}

    def it_returns_text_for_string_locator():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, "Hello")
        assert loc.text() == "Hello"


def describe_locator_full_match():

    def it_matches_when_stripped_line_equals_text():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, "Hello, World!", full=True)
        assert loc.is_visible()

    def it_rejects_partial_match():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, "Hello", full=True)
        assert not loc.is_visible()

    def it_matches_with_surrounding_whitespace():
        term = _mock_terminal(["  Hello  "], cols=20)
        loc = Locator(term, "Hello", full=True)
        assert loc.is_visible()


def describe_locator_regex_match():

    def it_matches_regex_pattern():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, re.compile(r"Hello, \w+!"))
        assert loc.is_visible()

    def it_returns_matched_text():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, re.compile(r"Hello, \w+!"))
        assert loc.text() == "Hello, World!"

    def it_rejects_non_matching_regex():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, re.compile(r"Goodbye, \w+!"))
        assert not loc.is_visible()

    def it_supports_full_match_with_regex():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, re.compile(r"Hello, \w+!"), full=True)
        assert loc.is_visible()

    def it_rejects_partial_regex_in_full_mode():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, re.compile(r"Hello"), full=True)
        assert not loc.is_visible()

    def it_returns_empty_string_for_non_matching_regex():
        term = _mock_terminal(["Hello, World!"])
        loc = Locator(term, re.compile(r"NOPE"))
        assert loc.text() == ""


def describe_locator_click():

    def it_clicks_the_first_matched_cell():
        term = _mock_terminal(["", "  [ OK ]  [ OK ]"])
        Locator(term, "OK").click()
        term.click.assert_called_once_with(1, 4)

    def it_converts_buffer_rows_to_viewport_rows():
        term = _mock_terminal(["old", "old", "Save"])
        term._scrollback_len.return_value = 2
        Locator(term, "Save").click()
        term.click.assert_called_once_with(0, 0)

    def it_skips_matches_in_scrollback():
        term = _mock_terminal(["Save old", "", "Save new"])
        term._scrollback_len.return_value = 1
        Locator(term, "Save").click()
        term.click.assert_called_once_with(1, 0)

    def it_raises_when_text_is_not_on_screen():
        term = _mock_terminal(["Hello"])
        with pytest.raises(LookupError, match="'Save': text is not on screen"):
            Locator(term, "Save").click()
        term.click.assert_not_called()

    def it_raises_when_text_has_scrolled_out_of_the_viewport():
        term = _mock_terminal(["Save", "Hello"])
        term._scrollback_len.return_value = 1
        with pytest.raises(LookupError, match="has scrolled out of the viewport"):
            Locator(term, "Save").click()
        term.click.assert_not_called()
