"""Integration tests for Terminal.pid and Terminal.signal()."""

import re
import signal
import time
from pathlib import Path

import pytest

from curtaincall import expect


def _proc_state(pid: int) -> str:
    stat = Path(f"/proc/{pid}/stat").read_text()
    return stat.rsplit(")", 1)[1].split()[0]


def _wait_for_state(pid: int, predicate, timeout: float = 5.0) -> str:
    deadline = time.monotonic() + timeout
    state = _proc_state(pid)
    while not predicate(state) and time.monotonic() < deadline:
        time.sleep(0.05)
        state = _proc_state(pid)
    return state


def describe_pid():

    def it_matches_the_child_process_pid(terminal, fixture_cmd):
        term = terminal(fixture_cmd("report_pid.py"))
        expect(term.get_by_text(re.compile(r"PID=\d+"))).to_be_visible()
        reported = int(re.search(r"PID=(\d+)", term._get_screen_text()).group(1))
        assert term.pid == reported


def describe_signal():

    def it_delivers_sigint_to_the_child(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.signal(signal.SIGINT)
        expect(term.get_by_text("Cleanup")).to_be_visible()
        assert term.wait(timeout=5.0) == 130

    def it_terminates_the_child_with_sigterm(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.signal(signal.SIGTERM)
        expect(term).to_have_exited(timeout=5.0)

    @pytest.mark.skipif(not Path("/proc/self/stat").exists(), reason="needs /proc")
    def it_suspends_and_resumes_the_child(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.signal(signal.SIGSTOP)
        assert _wait_for_state(term.pid, lambda s: s == "T") == "T"
        term.signal(signal.SIGCONT)
        assert _wait_for_state(term.pid, lambda s: s != "T") != "T"

    def it_is_a_noop_after_the_child_exits(terminal, fixture_cmd):
        term = terminal(fixture_cmd("exit_code.py") + " 0")
        term.wait(timeout=5.0)
        term.signal(signal.SIGTERM)
        assert term.exit_code == 0
