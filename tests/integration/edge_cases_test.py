"""Integration tests for edge cases and failure modes."""

import re
import time

from curtaincall import expect


def describe_auto_waiting():

    def it_waits_for_sequential_output(terminal, fixture_cmd):
        """Slow output should be found by auto-waiting expect."""
        term = terminal(fixture_cmd("slow_output.py"))
        expect(term.get_by_text("line 1")).to_be_visible()
        expect(term.get_by_text("line 2")).to_be_visible()
        expect(term.get_by_text("line 3")).to_be_visible()
        expect(term.get_by_text("done")).to_be_visible()


def describe_locator_edge_cases():

    def it_matches_regex_across_output(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text(re.compile(r"Hello, \w+!"))).to_be_visible()

    def it_full_match_rejects_partial_line(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        # "Hello" alone is not the full line
        assert not term.get_by_text("Hello", full=True).is_visible()

    def it_full_match_accepts_exact_line(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!", full=True)).to_be_visible()

    def it_to_contain_text_works(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        expect(term.get_by_text("Hello, World!")).to_contain_text("World")

    def it_finds_regex_text_content(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        loc = term.get_by_text(re.compile(r"Hello, (\w+)!"))
        expect(loc).to_be_visible()
        assert loc.text() == "Hello, World!"

    def it_regex_full_match_on_exact_line(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        loc = term.get_by_text(re.compile(r"Hello, \w+!"), full=True)
        expect(loc).to_be_visible()
        assert loc.text() == "Hello, World!"


def describe_terminal_edge_cases():

    def it_handles_rapid_input(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"))
        expect(term.get_by_text("ready>")).to_be_visible()
        for i in range(5):
            term.submit(f"msg{i}")
        expect(term.get_by_text("echo: msg4")).to_be_visible()

    def it_handles_empty_submit(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"))
        expect(term.get_by_text("ready>")).to_be_visible()
        term.submit("")
        # Empty line echoes as "echo: "
        expect(term.get_by_text("echo:")).to_be_visible()

    def it_survives_child_exit(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        # Child has exited by now; buffer should still be readable
        buf = term.get_buffer()
        assert len(buf) > 0

    def it_submit_quit_ends_echo(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"))
        expect(term.get_by_text("ready>")).to_be_visible()
        term.submit("quit")
        expect(term.get_by_text("bye")).to_be_visible()

    def it_handles_child_crash(terminal, fixture_cmd):
        """Process that crashes immediately should not hang or raise on buffer read."""
        term = terminal(fixture_cmd("crash.py"))
        # Give it a moment to crash
        time.sleep(0.5)
        buf = term.get_buffer()
        assert len(buf) > 0
        # The traceback should be visible
        text = term._get_screen_text()
        assert "RuntimeError" in text or "intentional crash" in text

    def it_handles_large_output_burst(terminal, fixture_cmd):
        """200 lines of rapid output should all be consumed by the reader thread."""
        term = terminal(fixture_cmd("large_output.py"), rows=30, cols=40)
        expect(term.get_by_text("DONE")).to_be_visible(timeout=10.0)
        # The last lines before DONE should be visible in the buffer
        text = term._get_screen_text()
        assert "DONE" in text

    def it_handles_unicode_output(terminal, fixture_cmd):
        """CJK characters, accented text, and box drawing should render."""
        term = terminal(fixture_cmd("unicode_output.py"), rows=10, cols=60)
        expect(term.get_by_text("UNICODE_DONE")).to_be_visible()
        text = term._get_screen_text()
        assert "ASCII: Hello, World!" in text
        assert "caf\u00e9" in text

    def it_verifies_env_propagation(terminal, fixture_cmd):
        """Custom env vars and TERM=xterm-256color should reach the child."""
        term = terminal(fixture_cmd("env_check.py"), env={"CC_TEST": "present"})
        expect(term.get_by_text("ENV_DONE")).to_be_visible()
        expect(term.get_by_text("TERM=xterm-256color")).to_be_visible()
        expect(term.get_by_text("CC_TEST=present")).to_be_visible()

    def it_kill_terminates_hung_process(terminal, fixture_cmd):
        """kill() should force-terminate a long-running process."""
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.kill()
        assert not term._child.isalive()

    def it_buffer_readable_after_kill(terminal, fixture_cmd):
        """Screen buffer should remain readable after kill."""
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.kill()
        buf = term.get_buffer()
        assert len(buf) > 0
        text = term._get_screen_text()
        assert "Running" in text

    def it_get_viewable_buffer_matches_get_buffer_without_scrollback(terminal, fixture_cmd):
        """With no scrollback, viewable == full buffer."""
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        assert term.get_viewable_buffer() == term.get_buffer()


def describe_scrollback_buffer():
    """Tests for scrollback buffer support (issue #1)."""

    def it_finds_text_scrolled_off_viewport(terminal, fixture_cmd):
        """Stderr warnings that push stdout off-screen should not hide content."""
        term = terminal(fixture_cmd("stderr_warning.py"), rows=5, cols=60)
        expect(term.get_by_text("STDERR_DONE")).to_be_visible()
        # The Usage line may have scrolled off the 5-row viewport,
        # but get_by_text searches the full buffer including scrollback
        expect(term.get_by_text("Usage: my-tool")).to_be_visible()

    def it_scrollback_not_in_viewable_buffer(terminal, fixture_cmd):
        """get_viewable_buffer excludes scrollback lines."""
        term = terminal(fixture_cmd("stderr_warning.py"), rows=5, cols=60)
        expect(term.get_by_text("STDERR_DONE")).to_be_visible()
        viewable = term.get_viewable_buffer()
        full = term.get_buffer()
        assert len(full) > len(viewable)
        assert len(viewable) == 5

    def it_snapshot_only_shows_viewport(terminal, fixture_cmd):
        """to_snapshot() should render the viewport, not scrollback."""
        term = terminal(fixture_cmd("large_output.py"), rows=5, cols=40)
        expect(term.get_by_text("DONE")).to_be_visible(timeout=10.0)
        snap = term.to_snapshot()
        lines = snap.split("\n")
        # 1 top border + 5 content + 1 bottom border = 7 lines
        assert len(lines) == 7

    def it_large_output_searchable_in_scrollback(terminal, fixture_cmd):
        """200 lines of output: early lines in scrollback, still findable."""
        term = terminal(fixture_cmd("large_output.py"), rows=10, cols=40)
        expect(term.get_by_text("DONE")).to_be_visible(timeout=10.0)
        # line-0000 was emitted first and is certainly in scrollback
        expect(term.get_by_text("line-0000")).to_be_visible()
        expect(term.get_by_text("line-0100")).to_be_visible()


def describe_suppress_stderr():
    """Tests for suppress_stderr option."""

    def it_suppresses_stderr_warnings(terminal, fixture_cmd):
        """With suppress_stderr=True, stderr output should not appear."""
        term = terminal(
            fixture_cmd("stderr_warning.py"),
            rows=10, cols=60,
            suppress_stderr=True,
        )
        expect(term.get_by_text("STDERR_DONE")).to_be_visible()
        text = term._get_screen_text()
        assert "WARNING" not in text
        expect(term.get_by_text("Usage: my-tool")).to_be_visible()


def describe_snapshot_edge_cases():

    def it_snapshot_after_input(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"), rows=10, cols=40)
        expect(term.get_by_text("ready>")).to_be_visible()
        term.submit("hello")
        expect(term.get_by_text("echo: hello")).to_be_visible()
        snap = term.to_snapshot()
        assert "echo: hello" in snap

    def it_snapshot_with_small_terminal(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"), rows=3, cols=20)
        expect(term.get_by_text("Hello")).to_be_visible()
        snap = term.to_snapshot()
        lines = snap.split("\n")
        # 1 top + 3 content + 1 bottom = 5 lines
        assert len(lines) == 5

    def it_snapshot_after_resize(terminal, fixture_cmd):
        term = terminal(fixture_cmd("resize_detect.py"), rows=10, cols=40)
        expect(term.get_by_text("40x10")).to_be_visible()
        snap1 = term.to_snapshot()
        term.set_size(rows=15, cols=60)
        expect(term.get_by_text("60x15")).to_be_visible()
        snap2 = term.to_snapshot()
        assert snap1 != snap2
        assert len(snap2.split("\n")[0]) == 62  # 60 + 2 borders

    def it_snapshot_contains_box_borders(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"), rows=5, cols=30)
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        snap = term.to_snapshot()
        assert "\u256d" in snap  # top-left corner
        assert "\u256e" in snap  # top-right corner
        assert "\u256f" in snap  # bottom-left
        assert "\u2570" in snap  # bottom-right
        assert "\u2502" in snap  # vertical bar
        assert "\u2500" in snap  # horizontal bar
