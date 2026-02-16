"""Integration tests for Terminal lifecycle: spawn, read, cleanup."""

import pytest

from curtaincall import expect


def describe_terminal_lifecycle():

    def it_reads_output_from_spawned_process(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()

    def it_cleans_up_child_process_on_kill(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.kill()
        assert not term._child.isalive()

    def it_respects_custom_dimensions(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"), rows=24, cols=40)
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        buf = term.get_buffer()
        assert len(buf) == 24
        assert all(len(row) == 40 for row in buf)

    def it_passes_custom_env_to_child(terminal, fixture_cmd):
        term = terminal(
            fixture_cmd("hello.py"),
            env={"CC_TEST": "present"},
        )
        expect(term.get_by_text("Hello, World!")).to_be_visible()

    def it_handles_immediate_exit(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 0")
        # Should not hang or raise -- just verify we can read the buffer
        buf = term.get_buffer()
        assert len(buf) > 0

    def it_handles_nonzero_exit(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 1")
        buf = term.get_buffer()
        assert len(buf) > 0


def describe_exit_code():

    def it_captures_zero_exit_code(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 0")
        term.wait(timeout=5.0)
        assert term.exit_code == 0

    def it_captures_nonzero_exit_code(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 42")
        term.wait(timeout=5.0)
        assert term.exit_code == 42

    def it_captures_exit_code_1(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 1")
        term.wait(timeout=5.0)
        assert term.exit_code == 1

    def it_exit_code_is_none_while_running(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        assert term.exit_code is None


def describe_wait():

    def it_wait_returns_exit_code(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        code = term.wait(timeout=5.0)
        assert code == 0

    def it_wait_timeout_on_long_running_process(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        with pytest.raises(TimeoutError):
            term.wait(timeout=0.5)


def describe_is_alive():

    def it_is_alive_while_running(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        assert term.is_alive is True

    def it_is_not_alive_after_exit(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 0")
        term.wait(timeout=5.0)
        assert term.is_alive is False


def describe_to_have_exited():

    def it_asserts_process_exited(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term).to_have_exited(timeout=5.0)
        assert term.exit_code == 0

    def it_asserts_process_exited_with_code(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 2")
        expect(term).to_have_exited(timeout=5.0)
        assert term.exit_code == 2

    def it_fails_when_process_still_running(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        with pytest.raises(AssertionError, match="Expected process to have exited"):
            expect(term).to_have_exited(timeout=0.5)
