"""Integration tests for Terminal lifecycle: spawn, read, cleanup."""

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
