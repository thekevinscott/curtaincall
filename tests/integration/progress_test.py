"""Integration tests for carriage-return based progress output."""

from curtaincall import expect


def describe_progress_output():

    def it_shows_final_progress(terminal, fixture_cmd):
        term = terminal(fixture_cmd("progress.py"), rows=5, cols=40)
        expect(term.get_by_text("100%")).to_be_visible()

    def it_overwrites_previous_line(terminal, fixture_cmd):
        term = terminal(fixture_cmd("progress.py"), rows=5, cols=40)
        expect(term.get_by_text("Done!")).to_be_visible()
        # The carriage return should overwrite earlier progress values
        # Only the final "100% Done!" should be visible
        expect(term.get_by_text("20%")).not_to_be_visible()
