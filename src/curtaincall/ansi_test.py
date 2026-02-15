"""Unit tests for ANSI escape constants."""

from curtaincall import ansi


def describe_ansi_constants():

    def it_defines_arrow_keys():
        assert ansi.UP == "\x1b[A"
        assert ansi.DOWN == "\x1b[B"
        assert ansi.RIGHT == "\x1b[C"
        assert ansi.LEFT == "\x1b[D"

    def it_defines_control_keys():
        assert ansi.ENTER == "\r"
        assert ansi.BACKSPACE == "\x7f"
        assert ansi.DELETE == "\x1b[3~"
        assert ansi.TAB == "\t"
        assert ansi.ESCAPE == "\x1b"
        assert ansi.CTRL_C == "\x03"
        assert ansi.CTRL_D == "\x04"

    def it_uses_escape_prefix_for_arrows():
        for key in (ansi.UP, ansi.DOWN, ansi.LEFT, ansi.RIGHT):
            assert key.startswith("\x1b[")
