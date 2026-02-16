# Default recipe - show available commands
default:
    @just --list

# Run linter
lint:
    uv run ruff check .

# Run formatter check
format-check:
    uv run ruff format --check .

# Format code
format:
    uv run ruff format .

# Fix auto-fixable lint issues
fix:
    uv run ruff check --fix .
    uv run ruff format .

# Clean build artifacts
clean:
    rm -rf build/ dist/ *.egg-info

# Build package
build: clean
    uv build

# Run security scan
security:
    uv run bandit -r src/curtaincall/ --skip B101 -x '*_test.py'

# Run unit tests
test-unit *args:
    uv run pytest src/curtaincall/ {{args}}

# Run integration tests
test-integration *args:
    uv run pytest tests/integration/ {{args}}

# Run all tests
test *args:
    uv run pytest {{args}}

# Run tests with coverage (fails if under threshold)
# Uses `coverage run` instead of `pytest --cov` because curtaincall is a
# pytest plugin that gets imported before --cov starts measuring.
test-cov:
    uv run coverage run -p --source=src/curtaincall -m pytest
    uv run coverage combine
    uv run coverage report --fail-under=95

# Run tests with coverage for CI (outputs XML)
test-ci:
    uv run coverage run -p --source=src/curtaincall -m pytest
    uv run coverage combine
    uv run coverage xml
    uv run coverage report --fail-under=95

# Run local CI checks (pre-push). Lint/format in parallel, then tests.
ci:
    #!/usr/bin/env bash
    set -euo pipefail
    just lint &
    just format-check &
    wait
    just test-unit

# Run full local CI including integration tests
ci-local:
    #!/usr/bin/env bash
    set -euo pipefail
    just lint &
    just format-check &
    wait
    just test-unit &
    just test-integration &
    wait

# Watch unit tests
test-unit-watch *args:
    uv run ptw --now src/curtaincall src/curtaincall/ {{args}}

# Watch integration tests
test-integration-watch *args:
    uv run ptw --now tests/integration tests/integration/ {{args}}
