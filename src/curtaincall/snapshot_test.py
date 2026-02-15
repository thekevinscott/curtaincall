"""Unit tests for snapshot rendering logic."""

from unittest.mock import MagicMock

from curtaincall.snapshot import render_snapshot


def _mock_terminal(lines: list[str], cols: int = 20) -> MagicMock:
    """Create a mock terminal for snapshot rendering."""
    term = MagicMock()
    buffer = []
    for line in lines:
        row = list(line.ljust(cols))
        buffer.append(row)
    term.get_viewable_buffer.return_value = buffer

    screen = MagicMock()
    screen.columns = cols
    term._screen = screen
    return term


def describe_render_snapshot():

    def it_wraps_content_in_box_borders():
        term = _mock_terminal(["hello", "world"], cols=10)
        snap = render_snapshot(term)
        lines = snap.split("\n")
        assert lines[0] == "\u256d" + "\u2500" * 10 + "\u256e"
        assert lines[-1] == "\u256f" + "\u2500" * 10 + "\u2570"

    def it_uses_vertical_bars_for_content_rows():
        term = _mock_terminal(["hello"], cols=10)
        snap = render_snapshot(term)
        lines = snap.split("\n")
        assert lines[1].startswith("\u2502")
        assert lines[1].endswith("\u2502")

    def it_pads_content_to_full_width():
        term = _mock_terminal(["hi"], cols=10)
        snap = render_snapshot(term)
        lines = snap.split("\n")
        # Content line: border + 10 chars + border = 12 total
        assert len(lines[1]) == 12

    def it_preserves_content_text():
        term = _mock_terminal(["Hello, World!"], cols=20)
        snap = render_snapshot(term)
        assert "Hello, World!" in snap

    def it_renders_correct_number_of_rows():
        term = _mock_terminal(["line1", "line2", "line3"], cols=10)
        snap = render_snapshot(term)
        lines = snap.split("\n")
        # 1 top border + 3 content + 1 bottom border
        assert len(lines) == 5

    def it_is_stable_across_calls():
        term = _mock_terminal(["stable content"], cols=20)
        snap1 = render_snapshot(term)
        snap2 = render_snapshot(term)
        assert snap1 == snap2
