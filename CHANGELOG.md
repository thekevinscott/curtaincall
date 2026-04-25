# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Because curtaincall is pre-1.0 and does not yet strictly follow [SemVer](https://semver.org/), every PR must add an entry under `[Unreleased]` regardless of whether the change touches the public API. See [AGENTS.md](AGENTS.md#changelog) for details.

Breaking changes and meaningful deprecations must also add an entry to [MIGRATIONS.md](MIGRATIONS.md).

## [Unreleased]

### Added

- `CHANGELOG.md` and `MIGRATIONS.md` at the repo root, with `MIGRATIONS.md` included in the docs site as the Migrations page.
- CI check (`.github/workflows/changelog.yml`) requiring every PR to update `CHANGELOG.md`, with a `Skip-Changelog: true` git commit trailer as the escape hatch for PRs without consumer impact.
- CI also enforces a `MIGRATIONS.md` diff when any commit in the PR carries a `Breaking-Change: true` trailer.
- `AGENTS.md` is now the single source of agent / project conventions; `CLAUDE.md` is a thin `@AGENTS.md` include so both standards stay in sync.

### Changed

- Documentation restructured into three levels with clear roles: `README.md` (concise overview that mirrors the `docs/` structure as `##` headings), `docs/` (full markdown that ships inside the installed package at `curtaincall/docs/` so agents can read it without network access), and the published mkdocs site (1:1 with `docs/`). Each `docs/` page now links to its published URL at the top, and each `README.md` section links to the corresponding `docs/` page.
- Wheel build now force-includes `docs/` under `curtaincall/docs/`; sdist now declares an explicit `include` list covering source, tests, docs, and project metadata files.
- Release orchestration migrated to [putitoutthere](https://github.com/thekevinscott/put-it-out-there). The legacy `publish.yml` / `patch-release.yml` / `minor-release.yml` workflows are replaced by a single `release.yml` driven by `putitoutthere.toml`. Releases now ship on every merge to main that touches `src/**` or `pyproject.toml` (`cadence = "immediate"`), instead of on a nightly cron. Preserved: trusted PyPI publishing, GitHub Release per tag, `v{version}` tag format. Minor/major bumps are signaled by a `release: minor|major` git commit trailer; `release: skip` suppresses an otherwise-cascading patch. Tag rollback on publish failure is no longer automatic.

### Deprecated

### Removed

### Fixed

### Security
