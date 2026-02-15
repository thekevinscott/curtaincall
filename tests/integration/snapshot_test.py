"""Integration tests for snapshot serialization with real terminals."""

from curtaincall import expect


def describe_snapshot_integration():

    def it_produces_snapshot_from_real_terminal(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"), rows=5, cols=30)
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        snap = term.to_snapshot()
        assert "Hello, World!" in snap

    def it_has_correct_border_width(terminal, fixture_cmd):
        cols = 40
        term = terminal(fixture_cmd("hello.py"), rows=5, cols=cols)
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        snap = term.to_snapshot()
        lines = snap.split("\n")
        # Top border: corner + cols dashes + corner
        assert len(lines[0]) == cols + 2

    def it_is_stable_across_calls(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"), rows=5, cols=30)
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        snap1 = term.to_snapshot()
        snap2 = term.to_snapshot()
        assert snap1 == snap2

    def it_reflects_terminal_content_changes(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"), rows=10, cols=40)
        expect(term.get_by_text("ready>")).to_be_visible()
        snap_before = term.to_snapshot()

        term.submit("test input")
        expect(term.get_by_text("echo: test input")).to_be_visible()
        snap_after = term.to_snapshot()

        assert snap_before != snap_after
        assert "echo: test input" in snap_after
