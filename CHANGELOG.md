# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Because curtaincall is pre-1.0 and does not yet strictly follow [SemVer](https://semver.org/), every PR must add an entry under `[Unreleased]` regardless of whether the change touches the public API. See [AGENTS.md](AGENTS.md#changelog) for details.

Breaking changes and meaningful deprecations must also add an entry to [MIGRATIONS.md](MIGRATIONS.md).

## [Unreleased]

### Added

- Mouse click helpers: `Locator.click()` left-clicks the first match in the viewport, and `Terminal.click(row, col)` left-clicks a cell by 0-based viewport coordinates. Both send an SGR mouse press then release, converting to 1-based coordinates and (for locators) from buffer rows to viewport rows.
- `CHANGELOG.md` and `MIGRATIONS.md` at the repo root, with `MIGRATIONS.md` included in the docs site as the Migrations page.
- CI check (`.github/workflows/changelog.yml`) requiring every PR to update `CHANGELOG.md`, with a `Skip-Changelog: true` git commit trailer as the escape hatch for PRs without consumer impact.
- CI also enforces a `MIGRATIONS.md` diff when any commit in the PR carries a `Breaking-Change: true` trailer.
- `AGENTS.md` is now the single source of agent / project conventions.
- "Session handoff doc" section in `AGENTS.md`, describing the per-session handoff doc agents deliver at each stopping point.

### Changed

- Minimum supported Python lowered from 3.12 to 3.10, so projects supporting 3.10+ can add curtaincall as a dev dependency without environment markers. CI now tests 3.10 through 3.13.
- Documentation restructured into three levels with clear roles: `README.md` (concise overview that mirrors the `docs/` structure as `##` headings), `docs/` (full markdown that ships inside the installed package at `curtaincall/docs/` so agents can read it without network access), and the published mkdocs site (1:1 with `docs/`). Each `docs/` page now links to its published URL at the top, and each `README.md` section links to the corresponding `docs/` page.
- Wheel build now force-includes `docs/` under `curtaincall/docs/`; sdist now declares an explicit `include` list covering source, tests, docs, and project metadata files.
- Release orchestration migrated to [putitoutthere](https://github.com/thekevinscott/put-it-out-there). The legacy `publish.yml` / `patch-release.yml` / `minor-release.yml` workflows are replaced by a single `release.yml` driven by `putitoutthere.toml`. Releases now ship on every merge to main that touches `src/**` or `pyproject.toml` (`cadence = "immediate"`), instead of on a nightly cron. Preserved: trusted PyPI publishing, GitHub Release per tag, `v{version}` tag format. Minor/major bumps are signaled by a `release: minor|major` git commit trailer; `release: skip` suppresses an otherwise-cascading patch. The git tag is now cut only after the PyPI upload succeeds, so a failed publish leaves no tag behind.

### Deprecated

### Removed

- `CLAUDE.md` (it only pointed at `AGENTS.md`, which Claude Code now reads directly); it is also dropped from the sdist.

### Fixed

- Releases were not publishing: every Release run since August failed because `putitoutthere.toml` used config keys the release engine no longer accepts. The config and `release.yml` now follow putitoutthere's current reusable-workflow setup, and a new `putitoutthere-check.yml` PR check validates the config. Releases now publish a wheel alongside the sdist, with the correct version; earlier attempts published `0.3.1.dev2` / `0.3.2.dev3` sdists because hatch-vcs ignored the package-specific version override.
- Docs site header repo link (and `site_url`) pointed at the nonexistent `thekevinbot/curtaincall`; it now links to `thekevinscott/curtaincall`.

### Security
