"""Integration tests for box-drawing table output and snapshots."""

import re

from curtaincall import expect


def describe_table_output():

    def it_renders_table_content(terminal, fixture_cmd):
        term = terminal(fixture_cmd("table.py"), rows=10, cols=40)
        expect(term.get_by_text("Results")).to_be_visible()
        expect(term.get_by_text("Alice")).to_be_visible()
        expect(term.get_by_text("Bob")).to_be_visible()

    def it_renders_table_headers(terminal, fixture_cmd):
        term = terminal(fixture_cmd("table.py"), rows=10, cols=40)
        expect(term.get_by_text("Name")).to_be_visible()
        expect(term.get_by_text("Score")).to_be_visible()

    def it_matches_scores_with_regex(terminal, fixture_cmd):
        term = terminal(fixture_cmd("table.py"), rows=10, cols=40)
        expect(term.get_by_text(re.compile(r"\d{2}"))).to_be_visible()

    def it_produces_stable_snapshot(terminal, fixture_cmd):
        term = terminal(fixture_cmd("table.py"), rows=10, cols=40)
        expect(term.get_by_text("Results")).to_be_visible()
        snap1 = term.to_snapshot()
        snap2 = term.to_snapshot()
        assert snap1 == snap2
        assert "Alice" in snap1
        assert "Bob" in snap1
