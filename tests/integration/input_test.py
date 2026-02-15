"""Integration tests for Terminal input methods."""

from curtaincall import expect


def describe_terminal_input():

    def it_submits_text_and_reads_echo(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"))
        expect(term.get_by_text("ready>")).to_be_visible()
        term.submit("hello world")
        expect(term.get_by_text("echo: hello world")).to_be_visible()

    def it_handles_multiple_submits(terminal, fixture_cmd):
        term = terminal(fixture_cmd("echo.py"))
        expect(term.get_by_text("ready>")).to_be_visible()
        term.submit("first")
        expect(term.get_by_text("echo: first")).to_be_visible()
        term.submit("second")
        expect(term.get_by_text("echo: second")).to_be_visible()

    def it_sends_ctrl_c_to_signal_handler(terminal, fixture_cmd):
        term = terminal(fixture_cmd("signal_handler.py"))
        expect(term.get_by_text("Running")).to_be_visible()
        term.key_ctrl_c()
        expect(term.get_by_text("Cleanup")).to_be_visible()

    def it_navigates_arrow_menu(terminal, fixture_cmd):
        term = terminal(fixture_cmd("arrow_menu.py"), rows=24, cols=80)
        expect(term.get_by_text("Select an option:")).to_be_visible()
        term.key_down()
        term.key_down()
        term.key_enter()
        expect(term.get_by_text("Selected: Option C")).to_be_visible()
