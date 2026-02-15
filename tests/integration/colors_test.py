"""Integration tests for color/style assertions."""

import pytest

from curtaincall import expect


def describe_color_assertions():

    def it_detects_red_foreground(terminal, fixture_cmd):
        term = terminal(fixture_cmd("colors.py"))
        expect(term.get_by_text("ERROR")).to_be_visible()
        expect(term.get_by_text("ERROR")).to_have_fg_color("red")

    def it_detects_green_foreground(terminal, fixture_cmd):
        term = terminal(fixture_cmd("colors.py"))
        expect(term.get_by_text("OK")).to_be_visible()
        expect(term.get_by_text("OK")).to_have_fg_color("green")

    def it_detects_blue_background(terminal, fixture_cmd):
        term = terminal(fixture_cmd("colors.py"))
        expect(term.get_by_text("HIGHLIGHT")).to_be_visible()
        expect(term.get_by_text("HIGHLIGHT")).to_have_bg_color("blue")

    def it_raises_on_wrong_fg_color(terminal, fixture_cmd):
        term = terminal(fixture_cmd("colors.py"))
        expect(term.get_by_text("ERROR")).to_be_visible()
        with pytest.raises(AssertionError):
            expect(term.get_by_text("ERROR")).to_have_fg_color("green", timeout=0.5)

    def it_raises_on_wrong_bg_color(terminal, fixture_cmd):
        term = terminal(fixture_cmd("colors.py"))
        expect(term.get_by_text("HIGHLIGHT")).to_be_visible()
        with pytest.raises(AssertionError):
            expect(term.get_by_text("HIGHLIGHT")).to_have_bg_color("red", timeout=0.5)
