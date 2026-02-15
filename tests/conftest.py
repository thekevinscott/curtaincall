"""Shared test fixtures for integration tests."""

from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixture_cmd():
    """Return a helper that builds the command to run a test fixture program."""

    def _cmd(name: str) -> str:
        return f"python {FIXTURES_DIR / name}"

    return _cmd
