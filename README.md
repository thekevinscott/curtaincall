# Curtaincall

Testing library for terminal applications.

Curtaincall is a pytest plugin for testing terminal (TUI) applications. It spawns real PTY sessions, emulates a VT100 terminal, and provides an expressive assertion API with auto-waiting locators. Inspired by Microsoft's [tui-test](https://github.com/microsoft/tui-test).

The `docs/` folder ships with the package — this README mirrors its structure. Each section here is a short summary that links to a full page in `docs/`. Published version: [thekevinscott.github.io/curtaincall](https://thekevinscott.github.io/curtaincall/).

## Installation

```bash
pip install curtaincall
```

Curtaincall registers itself as a pytest plugin automatically. The `terminal` fixture is available in any test file without imports.

Requirements: Python 3.12+, Linux or macOS (Unix PTYs).

## Motivation

TUI applications are typically tested by mocking stdin/stdout, which doesn't catch real terminal behavior: cursor positioning, color codes, redraws, signal handling, scrollback. Curtaincall runs your CLI in a real PTY and emulates a VT100 terminal, so tests assert against what a user would actually see.

## Quick Start

```python
from curtaincall import expect

def test_git_help(terminal):
    term = terminal("git --help")
    expect(term.get_by_text("usage: git")).to_be_visible()

def test_interactive_cli(terminal):
    term = terminal("python my_cli.py")
    term.submit("hello")
    expect(term.get_by_text("Hello!")).to_be_visible()
```

## Guide

### Getting Started

Install, write your first test, and learn how PTY spawning + VT100 emulation drive auto-waiting assertions. → [docs/guide/getting-started.md](docs/guide/getting-started.md)

### Terminal

The `Terminal` class manages a child process running in a pseudo-terminal. Read the screen, inspect the cursor, resize, and clean up. → [docs/guide/terminal.md](docs/guide/terminal.md)

### Locators

`get_by_text()` returns a lazy locator that finds text on the screen by substring, full-line, or regex match. → [docs/guide/locators.md](docs/guide/locators.md)

### Assertions

`expect(locator).to_be_visible()` polls until the condition holds. Also covers color and text-content assertions, with screen content in failure messages. → [docs/guide/assertions.md](docs/guide/assertions.md)

### Snapshots

`term.to_snapshot()` serializes the screen as a box-drawn string, suitable for snapshot testing with [syrupy](https://github.com/toptal/syrupy). → [docs/guide/snapshots.md](docs/guide/snapshots.md)

### Input

Send text, arrow keys, special keys, and control sequences (`Ctrl+C`, `Ctrl+D`, etc.) to the terminal. → [docs/guide/input.md](docs/guide/input.md)

### Fixtures

The `terminal` fixture is a factory: `terminal(command, rows=30, cols=80, env=None)`. Multiple terminals per test are supported; cleanup is automatic. → [docs/guide/fixtures.md](docs/guide/fixtures.md)

## API Reference

Generated reference for the public API. → [docs/api/](docs/api/)

- `Terminal` — [docs/api/terminal.md](docs/api/terminal.md)
- `Locator` — [docs/api/locator.md](docs/api/locator.md)
- `expect` — [docs/api/expect.md](docs/api/expect.md)
- Types — [docs/api/types.md](docs/api/types.md)

## Migrations

Upgrade instructions for releases with breaking changes or meaningful deprecations. → [MIGRATIONS.md](MIGRATIONS.md)

## License

MIT
