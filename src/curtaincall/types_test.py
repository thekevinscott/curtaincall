"""Unit tests for core data types."""

from curtaincall.types import CellStyle, CursorPosition


def describe_cursor_position():

    def it_stores_x_and_y():
        pos = CursorPosition(x=5, y=10)
        assert pos.x == 5
        assert pos.y == 10

    def it_is_frozen():
        pos = CursorPosition(x=0, y=0)
        try:
            pos.x = 1  # type: ignore[misc]
            raise AssertionError("Should have raised")
        except AttributeError:
            pass

    def it_supports_equality():
        assert CursorPosition(x=1, y=2) == CursorPosition(x=1, y=2)
        assert CursorPosition(x=1, y=2) != CursorPosition(x=3, y=4)


def describe_cell_style():

    def it_stores_colors():
        style = CellStyle(fg="red", bg="blue")
        assert style.fg == "red"
        assert style.bg == "blue"

    def it_has_defaults_for_flags():
        style = CellStyle(fg="default", bg="default")
        assert style.bold is False
        assert style.italic is False
        assert style.underscore is False
        assert style.reverse is False

    def it_stores_style_flags():
        style = CellStyle(fg="red", bg="blue", bold=True, italic=True)
        assert style.bold is True
        assert style.italic is True

    def it_is_frozen():
        style = CellStyle(fg="red", bg="blue")
        try:
            style.fg = "green"  # type: ignore[misc]
            raise AssertionError("Should have raised")
        except AttributeError:
            pass
