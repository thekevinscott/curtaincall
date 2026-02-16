"""pytest plugin providing the terminal fixture."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from curtaincall.terminal import Terminal


def _create_terminal_factory(
    terminals: list[Terminal],
) -> Callable[..., Terminal]:
    """Create a terminal factory function that tracks created terminals."""

    def _create(
        command: str,
        *,
        rows: int = 30,
        cols: int = 80,
        env: dict[str, str] | None = None,
        history: int = 1000,
        suppress_stderr: bool = False,
    ) -> Terminal:
        term = Terminal(
            command,
            rows=rows,
            cols=cols,
            env=env,
            history=history,
            suppress_stderr=suppress_stderr,
        )
        term.start()
        terminals.append(term)
        return term

    return _create


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

    yield _create_terminal_factory(terminals)

    for t in terminals:
        t.kill()
