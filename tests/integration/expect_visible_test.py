"""Integration tests for expect().to_be_visible() and .not_to_be_visible()."""

import time

import pytest

from curtaincall import expect


def describe_expect_to_be_visible():

    def it_finds_text_on_screen(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()

    def it_auto_waits_for_delayed_output(terminal, fixture_cmd):
        term = terminal(fixture_cmd("slow_output.py"))
        # "done" appears after ~0.9s of delays
        expect(term.get_by_text("done")).to_be_visible(timeout=5.0)

    def it_raises_on_timeout_with_screen_dump(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()

        with pytest.raises(AssertionError, match="MISSING") as exc_info:
            expect(term.get_by_text("MISSING")).to_be_visible(timeout=0.5)
        # Error message should include the screen content
        assert "Hello, World!" in str(exc_info.value)


def describe_expect_not_to_be_visible():

    def it_passes_for_absent_text(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()
        expect(term.get_by_text("MISSING")).not_to_be_visible()

    def it_raises_when_text_is_present(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()

        with pytest.raises(AssertionError):
            expect(term.get_by_text("Hello, World!")).not_to_be_visible(timeout=0.5)


def describe_expect_when_process_exits():

    def it_fails_fast_with_exit_status_and_screen(terminal, fixture_cmd):
        term = terminal(fixture_cmd("crash.py"))

        start = time.monotonic()
        with pytest.raises(AssertionError, match="MISSING") as exc_info:
            expect(term.get_by_text("MISSING")).to_be_visible(timeout=10.0)
        elapsed = time.monotonic() - start

        assert elapsed < 3.0
        message = str(exc_info.value)
        assert "Process exited with code 1" in message
        assert "intentional crash" in message

    def it_still_passes_when_text_arrived_before_exit(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        term.wait(timeout=5.0)
        expect(term.get_by_text("Hello, World!")).to_be_visible(timeout=10.0)

    def it_fails_fast_for_not_to_be_visible(terminal, fixture_cmd):
        term = terminal(fixture_cmd("hello.py"))
        term.wait(timeout=5.0)

        start = time.monotonic()
        with pytest.raises(AssertionError, match="Process exited with code 0"):
            expect(term.get_by_text("Hello, World!")).not_to_be_visible(timeout=10.0)
        assert time.monotonic() - start < 3.0
