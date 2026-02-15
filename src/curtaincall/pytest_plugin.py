"""pytest plugin providing the terminal fixture."""

from __future__ import annotations

import pytest

from curtaincall.terminal import Terminal


@pytest.fixture
def terminal():
    """Terminal session factory.

    Creates isolated PTY sessions. All terminals are automatically
    cleaned up after the test completes.

    Usage:
        def test_something(terminal):
            term = terminal("python my_cli.py")
            # ... test interactions ...
    """
    terminals: list[Terminal] = []

    def _create(
        command: str,
        *,
        rows: int = 30,
        cols: int = 80,
        env: dict[str, str] | None = None,
    ) -> Terminal:
        term = Terminal(command, rows=rows, cols=cols, env=env)
        term.start()
        terminals.append(term)
        return term

    yield _create

    for t in terminals:
        t.kill()
