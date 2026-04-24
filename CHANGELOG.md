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

### Deprecated

### Removed

### Fixed

### Security
