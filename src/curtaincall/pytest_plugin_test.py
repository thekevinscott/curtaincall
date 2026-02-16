"""Unit tests for pytest plugin fixture."""

from unittest.mock import MagicMock, patch

from curtaincall.pytest_plugin import _create_terminal_factory


def describe_terminal_factory():

    @patch("curtaincall.pytest_plugin.Terminal")
    def it_creates_terminal_with_defaults(MockTerminal):
        mock_term = MagicMock()
        MockTerminal.return_value = mock_term
        terminals = []

        factory = _create_terminal_factory(terminals)
        result = factory("my command")

        MockTerminal.assert_called_once_with(
            "my command", rows=30, cols=80, env=None, history=1000, suppress_stderr=False,
        )
        mock_term.start.assert_called_once()
        assert result is mock_term
        assert terminals == [mock_term]

    @patch("curtaincall.pytest_plugin.Terminal")
    def it_passes_custom_args(MockTerminal):
        mock_term = MagicMock()
        MockTerminal.return_value = mock_term
        terminals = []

        factory = _create_terminal_factory(terminals)
        factory("cmd", rows=24, cols=120, env={"A": "B"})

        MockTerminal.assert_called_once_with(
            "cmd", rows=24, cols=120, env={"A": "B"}, history=1000, suppress_stderr=False,
        )

    @patch("curtaincall.pytest_plugin.Terminal")
    def it_tracks_multiple_terminals(MockTerminal):
        terms = [MagicMock(), MagicMock(), MagicMock()]
        MockTerminal.side_effect = terms
        terminals = []

        factory = _create_terminal_factory(terminals)
        factory("cmd1")
        factory("cmd2")
        factory("cmd3")

        assert len(terminals) == 3
        for t in terms:
            t.start.assert_called_once()

    def it_creates_empty_terminals_list():
        terminals = []
        factory = _create_terminal_factory(terminals)
        assert callable(factory)
        assert terminals == []
