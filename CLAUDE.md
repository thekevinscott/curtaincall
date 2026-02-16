# Curtaincall Development

## Workflow
- **NEVER commit directly to main** - always create a PR
- **Before pushing**: run `uv run just ci` (lint, format check, unit tests in parallel)
- **After pushing**: run `gh pr checks <number> --watch` to monitor CI. Fix any failures immediately before moving on
- **After a PR is merged**: pull main to keep local in sync

### PR Scope
- **Keep PRs minimal but complete** - each PR should deliver one useful, self-contained piece of functionality
- Don't add code that isn't used until a future PR
- Every PR must include tests: integration tests for user-facing behavior, unit tests for internals

## Project Structure
- `src/curtaincall/` - Library source (terminal, locator, expect, types, ansi, snapshot, pytest_plugin)
- `tests/integration/` - Integration tests using real PTY sessions
- `tests/fixtures/` - Synthetic CLI programs for testing (all stdlib, no external deps)
- `docs/` - mkdocs-material site, deployed to GitHub Pages

## Testing

### Test Locations
- **Unit tests**: Colocated with source files (`foo.py` -> `foo_test.py` in same directory)
- **Integration tests**: `tests/integration/`
- **Test fixtures**: `tests/fixtures/` - simple Python scripts that produce terminal output

### Test Style
- pytest-describe: `describe_*` blocks with `it_*` functions
- `terminal` fixture (from pytest plugin) creates real PTY sessions
- `fixture_cmd` fixture (from `tests/conftest.py`) builds commands for test fixture programs
- `expect(locator).to_be_visible()` for auto-waiting assertions

### Coverage
- **Use `coverage run -m pytest`, NOT `pytest --cov`** - curtaincall is a pytest plugin that gets imported before `--cov` starts measuring, causing false ~72% coverage. `coverage run` starts measuring before pytest loads plugins.
- `just test-ci` uses the correct approach
- `fail_under = 95` in pyproject.toml

## Architecture
- PTY spawning via pexpect, VT100 emulation via pyte
- `pyte.HistoryScreen` for scrollback buffer support (content scrolled off viewport is still searchable)
- Background reader thread feeds PTY output to pyte via `ByteStream`
- Uses `threading.RLock` (not Lock) because `to_snapshot()` holds the lock and calls `get_viewable_buffer()` which also acquires it

### Key Concepts
- `get_buffer()` returns scrollback + viewport (full history)
- `get_viewable_buffer()` returns viewport only
- `to_snapshot()` renders viewport only (box-drawn format)
- `_get_char_at()` handles coordinate mapping between full buffer and pyte screen/scrollback

## Key Commands

`just` is installed via uv as `rust-just`:

```bash
uv run just test-unit       # Run unit tests
uv run just test-integration # Run integration tests
uv run just test-ci         # Tests + coverage (CI mode)
uv run just lint            # Ruff check
uv run just format-check    # Ruff format check
uv run just ci              # Full local CI (lint + format + unit tests)
```

## Versioning & Releases
- **hatch-vcs**: version derived from git tags, no hardcoded version in pyproject.toml
- `__version__` uses `importlib.metadata.version("curtaincall")`
- **Patch releases** run nightly at 2am UTC (automatic via `patch-release.yml`)
- **Minor releases** triggered manually via GitHub Actions -> "Minor Release"

## Code Style
- Python 3.12+, ruff for linting and formatting
- `line-length = 100`
- Skip redundant `Args:`/`Returns:` docstring sections - use type hints
- Test fixtures (programs in `tests/fixtures/`) use only stdlib - no Rich, no external deps

## Guidelines
- Check `uv.lock` for dependency versions - don't ask the user for info you can look up
- **Do not chain commands** (e.g., `cmd1 && cmd2`) - the security hook blocks them
- Write temp scripts to `/tmp/claude/` instead of `python -c`

## Commit Convention

| Type | Use for |
|------|---------|
| `feat:` | New user-facing functionality |
| `fix:` | Bug fixes |
| `test:` | Test additions/changes |
| `chore:` | Internal tooling, CI, maintenance |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation only |
| `style:` | Formatting changes |
