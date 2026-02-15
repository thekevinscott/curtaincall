"""Unit tests for Terminal class (mocked PTY)."""

import re
import threading
from unittest.mock import MagicMock, patch

import pexpect
import pyte

from curtaincall import ansi
from curtaincall.locator import Locator
from curtaincall.terminal import Terminal
from curtaincall.types import CursorPosition


def _make_terminal(rows: int = 5, cols: int = 20) -> Terminal:
    """Create a Terminal without starting it."""
    return Terminal("echo test", rows=rows, cols=cols)


def describe_terminal_init():

    def it_sets_dimensions():
        term = _make_terminal(rows=24, cols=80)
        assert term._rows == 24
        assert term._cols == 80

    def it_creates_pyte_screen():
        term = _make_terminal(rows=10, cols=40)
        assert isinstance(term._screen, pyte.Screen)
        assert term._screen.lines == 10
        assert term._screen.columns == 40

    def it_starts_not_running():
        term = _make_terminal()
        assert term._running is False
        assert term._child is None
        assert term._reader_thread is None

    def it_stores_command():
        term = Terminal("my command")
        assert term._command == "my command"

    def it_stores_env():
        term = Terminal("echo", env={"FOO": "bar"})
        assert term._env == {"FOO": "bar"}

    def it_defaults_env_to_none():
        term = Terminal("echo")
        assert term._env is None

    def it_uses_reentrant_lock():
        term = _make_terminal()
        assert isinstance(term._lock, type(threading.RLock()))


def describe_terminal_start():

    @patch("curtaincall.terminal.pexpect.spawn")
    def it_spawns_child_process(mock_spawn):
        mock_child = MagicMock()
        mock_child.read_nonblocking.side_effect = pexpect.EOF("done")
        mock_spawn.return_value = mock_child

        term = _make_terminal(rows=10, cols=40)
        term.start()

        mock_spawn.assert_called_once()
        call_kwargs = mock_spawn.call_args
        assert call_kwargs[0][0] == "echo test"
        assert call_kwargs[1]["dimensions"] == (10, 40)
        assert call_kwargs[1]["encoding"] is None
        assert term._running is True
        assert term._reader_thread is not None

        term._running = False
        term._reader_thread.join(timeout=1.0)

    @patch("curtaincall.terminal.pexpect.spawn")
    def it_sets_term_env(mock_spawn):
        mock_child = MagicMock()
        mock_child.read_nonblocking.side_effect = pexpect.EOF("done")
        mock_spawn.return_value = mock_child

        term = Terminal("echo", env={"MY_VAR": "123"})
        term.start()

        env = mock_spawn.call_args[1]["env"]
        assert env["TERM"] == "xterm-256color"
        assert env["MY_VAR"] == "123"

        term._running = False
        term._reader_thread.join(timeout=1.0)


def describe_terminal_write():

    def it_sends_text_to_child():
        term = _make_terminal()
        term._child = MagicMock()
        term.write("hello")
        term._child.send.assert_called_once_with("hello")

    def it_submit_appends_enter():
        term = _make_terminal()
        term._child = MagicMock()
        term.submit("cmd")
        term._child.send.assert_called_once_with("cmd" + ansi.ENTER)


def describe_terminal_key_methods():

    def it_sends_correct_escape_sequences():
        term = _make_terminal()
        term._child = MagicMock()

        key_map = {
            "key_up": ansi.UP,
            "key_down": ansi.DOWN,
            "key_left": ansi.LEFT,
            "key_right": ansi.RIGHT,
            "key_enter": ansi.ENTER,
            "key_backspace": ansi.BACKSPACE,
            "key_delete": ansi.DELETE,
            "key_tab": ansi.TAB,
            "key_escape": ansi.ESCAPE,
            "key_ctrl_c": ansi.CTRL_C,
            "key_ctrl_d": ansi.CTRL_D,
        }

        for method_name, expected_seq in key_map.items():
            term._child.reset_mock()
            getattr(term, method_name)()
            term._child.send.assert_called_once_with(expected_seq)


def describe_terminal_get_by_text():

    def it_returns_locator():
        term = _make_terminal()
        loc = term.get_by_text("hello")
        assert isinstance(loc, Locator)

    def it_passes_full_flag():
        term = _make_terminal()
        loc = term.get_by_text("hello", full=True)
        assert loc._full is True

    def it_accepts_regex():
        pattern = re.compile(r"hello \w+")
        term = _make_terminal()
        loc = term.get_by_text(pattern)
        assert loc._text is pattern


def describe_terminal_get_cursor():

    def it_returns_cursor_position():
        term = _make_terminal()
        # pyte Screen has a cursor object
        term._screen.cursor.x = 5
        term._screen.cursor.y = 3
        pos = term.get_cursor()
        assert isinstance(pos, CursorPosition)
        assert pos.x == 5
        assert pos.y == 3


def describe_terminal_get_buffer():

    def it_returns_2d_character_list():
        term = _make_terminal(rows=3, cols=5)
        buf = term.get_buffer()
        assert len(buf) == 3
        assert all(len(row) == 5 for row in buf)

    def it_uses_spaces_for_empty_cells():
        term = _make_terminal(rows=2, cols=5)
        buf = term.get_buffer()
        for row in buf:
            for char in row:
                assert char == " "

    def it_reads_screen_content():
        term = _make_terminal(rows=3, cols=10)
        # Feed content directly into pyte
        term._stream.feed(b"Hello")
        buf = term.get_buffer()
        line = "".join(buf[0])
        assert line.startswith("Hello")


def describe_terminal_get_viewable_buffer():

    def it_returns_same_as_get_buffer():
        term = _make_terminal(rows=3, cols=5)
        assert term.get_viewable_buffer() == term.get_buffer()


def describe_terminal_set_size():

    def it_resizes_screen_and_pty():
        term = _make_terminal(rows=10, cols=40)
        term._child = MagicMock()
        term.set_size(rows=20, cols=100)
        assert term._rows == 20
        assert term._cols == 100
        assert term._screen.lines == 20
        assert term._screen.columns == 100
        term._child.setwinsize.assert_called_once_with(20, 100)


def describe_terminal_kill():

    def it_stops_running_flag():
        term = _make_terminal()
        term._running = True
        term._child = MagicMock()
        term._child.isalive.return_value = False
        term.kill()
        assert term._running is False

    def it_terminates_alive_child():
        term = _make_terminal()
        term._running = True
        term._child = MagicMock()
        term._child.isalive.return_value = True
        term.kill()
        term._child.terminate.assert_called_once_with(force=True)
        term._child.close.assert_called_once()

    def it_closes_dead_child_without_terminate():
        term = _make_terminal()
        term._running = True
        term._child = MagicMock()
        term._child.isalive.return_value = False
        term.kill()
        term._child.terminate.assert_not_called()
        term._child.close.assert_called_once()

    def it_handles_no_child():
        term = _make_terminal()
        term._running = True
        term._child = None
        term.kill()  # should not raise

    def it_joins_reader_thread():
        term = _make_terminal()
        term._running = True
        term._child = MagicMock()
        term._child.isalive.return_value = False
        mock_thread = MagicMock()
        term._reader_thread = mock_thread
        term.kill()
        mock_thread.join.assert_called_once_with(timeout=2.0)


def describe_terminal_to_snapshot():

    def it_returns_string():
        term = _make_terminal(rows=3, cols=10)
        snap = term.to_snapshot()
        assert isinstance(snap, str)
        assert "\u256d" in snap  # top-left corner


def describe_terminal_get_screen_text():

    def it_returns_string_of_buffer():
        term = _make_terminal(rows=2, cols=10)
        term._stream.feed(b"Hello")
        text = term._get_screen_text()
        assert "Hello" in text

    def it_strips_trailing_whitespace_per_row():
        term = _make_terminal(rows=2, cols=20)
        term._stream.feed(b"Hi")
        text = term._get_screen_text()
        lines = text.split("\n")
        assert lines[0] == "Hi"


def describe_terminal_reader_loop():

    def it_feeds_data_to_stream():
        term = _make_terminal(rows=3, cols=10)
        mock_child = MagicMock()
        # First call returns data, second raises EOF
        mock_child.read_nonblocking.side_effect = [b"Hi", pexpect.EOF("done")]
        term._child = mock_child
        term._running = True

        term._reader_loop()

        assert "Hi" in term._get_screen_text()

    def it_handles_timeout():
        term = _make_terminal(rows=3, cols=10)
        mock_child = MagicMock()
        mock_child.read_nonblocking.side_effect = [
            pexpect.TIMEOUT("timeout"),
            b"OK",
            pexpect.EOF("done"),
        ]
        term._child = mock_child
        term._running = True

        term._reader_loop()

        assert "OK" in term._get_screen_text()

    def it_stops_when_running_is_false():
        term = _make_terminal(rows=3, cols=10)
        mock_child = MagicMock()
        term._child = mock_child
        term._running = False

        term._reader_loop()

        mock_child.read_nonblocking.assert_not_called()

    def it_skips_empty_data():
        term = _make_terminal(rows=3, cols=10)
        mock_child = MagicMock()
        mock_child.read_nonblocking.side_effect = [b"", b"X", pexpect.EOF("done")]
        term._child = mock_child
        term._running = True

        term._reader_loop()

        text = term._get_screen_text()
        assert "X" in text
