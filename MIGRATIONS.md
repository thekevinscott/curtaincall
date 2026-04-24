# Migrations

Upgrade instructions for releases with breaking changes or meaningful deprecations. See `CHANGELOG.md` in the repository for the full release history; versions without breaking changes are not listed here.

## How to add an entry

When a PR introduces a breaking change or removes a previously-deprecated feature:

1. Add a section under `## Unreleased` following the template below.
2. Add a `Breaking-Change: true` trailer to any commit in the PR. CI requires a `MIGRATIONS.md` diff whenever this trailer is present.

When a release is cut, publish automation renames `Unreleased` to the new version heading.

Each entry must include all five sections. If a section doesn't apply, write `_None._` rather than omitting the heading — this makes it obvious that the author considered it.

### Required sections

- **Summary** — one paragraph. What broke, and why the change was made. Focus on consumer impact, not implementation.
- **Required changes** — a table of before/after snippets for everything a consumer must edit: config keys, CLI flags, pytest plugin options, fixture names, Python API signatures, snapshot formats.
- **Deprecations removed** — anything that previously emitted a `DeprecationWarning` and is now gone. Link to the release where it was first deprecated.
- **Behavior changes without code changes** — same API surface, different runtime behavior. Tag formats, exit codes, default values, timing, ordering, output formatting — anything a consumer's code can observe.
- **Verification** — how a consumer confirms the upgrade worked. A dry-run command, expected output diff, or a short test snippet they can drop in.

### Template

```markdown
## Unreleased

### Summary

One paragraph describing what broke and why.

### Required changes

| What | Before | After |
| ---- | ------ | ----- |
| `some_option` config key | `some_option: true` | `some_option: "strict"` |

### Deprecations removed

- `old_function()` — deprecated in v0.2.0, removed now. Use `new_function()` instead.

### Behavior changes without code changes

- Exit code on timeout changed from `1` to `124` to match GNU `timeout`.

### Verification

Run `uv run pytest --curtaincall-check` in your project. Expected output:

    curtaincall: 1 terminal session, 0 warnings
```

---

## Unreleased

_No breaking changes yet._
