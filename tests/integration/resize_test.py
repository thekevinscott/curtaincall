"""Integration tests for cursor position and terminal resize."""

from curtaincall import expect


def describe_cursor():

    def it_returns_cursor_position(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        cursor = term.get_cursor()
        assert cursor.x >= 0
        assert cursor.y >= 0


def describe_resize():

    def it_shows_initial_size(terminal, fixture_cmd):
        term = terminal(fixture_cmd("resize_detect.py"), rows=24, cols=80)
        expect(term.get_by_text("80x24")).to_be_visible()

    def it_detects_resize(terminal, fixture_cmd):
        term = terminal(fixture_cmd("resize_detect.py"), rows=24, cols=80)
        expect(term.get_by_text("80x24")).to_be_visible()
        term.set_size(rows=40, cols=120)
        expect(term.get_by_text("120x40")).to_be_visible()
