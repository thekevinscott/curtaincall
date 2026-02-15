"""Integration tests for the pytest plugin and terminal fixture."""

from curtaincall import expect


def describe_terminal_fixture():

    def it_is_auto_discovered(terminal, fixture_cmd):
        """The fixture should be available without explicit import."""
        term = terminal(fixture_cmd("hello.py"))
        expect(term.get_by_text("Hello, World!")).to_be_visible()

    def it_supports_multiple_terminals(terminal, fixture_cmd):
        term1 = terminal(fixture_cmd("hello.py"))
        term2 = terminal(fixture_cmd("hello.py"), rows=24, cols=40)
        expect(term1.get_by_text("Hello, World!")).to_be_visible()
        expect(term2.get_by_text("Hello, World!")).to_be_visible()

    def it_cleans_up_all_terminals_after_test(terminal, fixture_cmd):
        """Long-running processes should be killed by fixture teardown."""
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        # Fixture teardown will handle cleanup
