# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Session handoff doc

Maintain one ongoing handoff doc per working session and deliver it to the user as a downloadable
markdown file at every **stopping point**: after each major unit of work lands (a push, an observed
CI run, a merged PR, a finished investigation) or when blocked on user input. A stopping point
marks a checkpoint, not the end — send the doc, then keep working.

The doc is conversation-scoped: keep it in the session scratchpad or `/tmp` (e.g.
`<scratchpad>/handoff.md`), outside the repo tree, and keep it out of every commit. Update the same
doc in place and re-send it at each checkpoint (in hosted sessions, attach it via the file-delivery
tool; locally, print its path), so the freshest copy sits near the bottom of the conversation.

Write it standalone, so a brand-new session with zero context resumes from it alone:

- Task and current status (done / in progress / next)
- Branches, PRs, and issues with numbers and CI state
- Key decisions and discovered constraints, with one-line reasons
- Exact next steps, including commands to run
- Anything waiting on the user

Purpose: the prompt cache survives at most an hour of inactivity, so resuming a long conversation
after hours away reprocesses the entire history at full cost. A current handoff doc near the end of
the transcript lets the user scroll up, grab it, and start a cheap fresh session from the doc
instead of resuming the stale one.

---

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

### Changelog
- **Every PR must update `CHANGELOG.md`** under the `## [Unreleased]` heading, in the appropriate section (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`) per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Scope is intentionally broad — curtaincall is pre-1.0 and does not strictly follow SemVer, so any change may be consumer-visible
- Enforced in CI by `.github/workflows/changelog.yml`. A PR that genuinely has no consumer impact (pure CI, internal refactor with no behavior change) can bypass the check by adding a `Skip-Changelog: true` trailer to any commit in the PR. Prefer writing an entry over using the trailer
- Example trailer:
  ```
  chore: rename internal helper

  Skip-Changelog: true
  ```
- **Breaking changes and meaningful deprecations** must also add an entry to `MIGRATIONS.md` under `## Unreleased`, with the five required sections: Summary, Required changes, Deprecations removed, Behavior changes without code changes, Verification. See `MIGRATIONS.md` for the template
- Signal a breaking change by adding a `Breaking-Change: true` trailer to any commit in the PR. When this trailer is present, CI requires a `MIGRATIONS.md` diff. Example:
  ```
  feat: rename terminal.run() to terminal.start()

  Breaking-Change: true
  ```
- Release automation renames `## [Unreleased]` in `CHANGELOG.md` and `## Unreleased` in `MIGRATIONS.md` to the new version heading when a tag is cut
- `MIGRATIONS.md` at repo root is the source of truth; it is included into the docs site via `docs/migrations.md`

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
- **Do NOT hardcode version** in `pyproject.toml` -- it uses `dynamic = ["version"]`

### Cutting a Release
Releases are orchestrated by [putitoutthere](https://github.com/thekevinscott/putitoutthere): `.github/workflows/release.yml` calls its reusable `release.yml@v0` workflow. Configuration lives in `putitoutthere.toml` at the repo root (`build = "hatch"`, `tag_format = "v{version}"`). `.github/workflows/putitoutthere-check.yml` validates that config against the engine's current schema on every PR; preview a release locally with `npx putitoutthere plan`.

- **Patch** (bug fixes): ships automatically on every merge to main that touches a path in the config's `globs` (currently `src/**`, `pyproject.toml`). Docs / tests / CI-only merges do not cascade
- **Minor** / **Major**: add a `release: minor` or `release: major` trailer to a commit on main
- **Skip**: add `release: skip` to a commit body to suppress an otherwise-cascading patch release
- **Manual** (e.g. re-release after a pipeline fix, or pick the bump yourself): `gh workflow run Release -f release_packages=curtaincall@minor` (`@patch`, `@major`, or an explicit `@X.Y.Z` also work)

The release workflow handles: build sdist + wheel (the reusable workflow sets `SETUPTOOLS_SCM_PRETEND_VERSION` so hatch-vcs sees the planned version) -> PyPI publish via trusted publishing in this repo's `pypi-publish` job (PyPI can't validate OIDC tokens from a cross-repo reusable workflow) -> `pypi-tag` cuts the git tag and GitHub Release only after the upload lands, so a failed publish leaves no tag behind.

### Version Scheme
- Tags follow `v{major}.{minor}.{patch}` (e.g., `v0.2.0`)
- hatch-vcs derives the version at build time from the nearest tag
- `local_scheme = "no-local-version"` ensures clean version strings on PyPI

## Code Style
- Python 3.10+, ruff for linting and formatting
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
