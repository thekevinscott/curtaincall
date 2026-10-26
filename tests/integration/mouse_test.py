"""Integration tests for mouse click input."""

from curtaincall import expect


def describe_terminal_click():

    def it_clicks_a_viewport_cell(terminal, fixture_cmd):
        term = terminal(fixture_cmd("mouse_click.py"), rows=10, cols=40)
        expect(term.get_by_text("ready")).to_be_visible()
        term.click(2, 10)
        expect(term.get_by_text("Clicked: Alpha (button 0)")).to_be_visible()

    def it_misses_when_cell_is_empty(terminal, fixture_cmd):
        term = terminal(fixture_cmd("mouse_click.py"), rows=10, cols=40)
        expect(term.get_by_text("ready")).to_be_visible()
        term.click(2, 9)
        expect(term.get_by_text("Clicked: none")).to_be_visible()


def describe_locator_click():

    def it_clicks_matched_text(terminal, fixture_cmd):
        term = terminal(fixture_cmd("mouse_click.py"), rows=10, cols=40)
        expect(term.get_by_text("ready")).to_be_visible()
        term.get_by_text("Beta").click()
        expect(term.get_by_text("Clicked: Beta (button 0)")).to_be_visible()

    def it_clicks_the_viewport_match_when_scrollback_has_earlier_matches(terminal, fixture_cmd):
        term = terminal(fixture_cmd("mouse_click.py") + " 25", rows=10, cols=40)
        expect(term.get_by_text("ready")).to_be_visible()
        expect(term.get_by_text("Beta filler 0")).to_be_visible()
        term.get_by_text("Beta").click()
        expect(term.get_by_text("Clicked: Beta (button 0)")).to_be_visible()
