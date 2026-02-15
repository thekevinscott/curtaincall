# Curtaincall

Testing library for terminal applications.

Curtaincall is a pytest plugin for testing terminal (TUI) applications. It spawns real PTY sessions, emulates a VT100 terminal, and provides an expressive assertion API with auto-waiting locators.

## Installation

```bash
pip install curtaincall
```

## Quick Example

```python
from curtaincall import expect

def test_git_help(terminal):
    term = terminal("git --help")
    expect(term.get_by_text("usage: git")).to_be_visible()

def test_interactive_cli(terminal):
    term = terminal("python my_cli.py")
    term.submit("hello")
    expect(term.get_by_text("Hello!")).to_be_visible()

def test_colors(terminal):
    term = terminal("python my_cli.py")
    expect(term.get_by_text("ERROR")).to_have_fg_color("red")
```

The `terminal` fixture is automatically available when curtaincall is installed -- no imports or configuration needed.

## Key Features

- **Auto-waiting assertions** -- `expect().to_be_visible()` polls until the text appears or times out
- **Real PTY sessions** -- tests run against actual terminal output, not mocked streams
- **Locator-based queries** -- find text by string or regex, with full-line matching support
- **Color assertions** -- verify foreground and background colors of terminal text
- **Snapshot testing** -- capture terminal state as diffable box-drawn strings
- **Keyboard input** -- send arrow keys, Ctrl+C, Tab, and other special keys
- **Terminal resize** -- test SIGWINCH handling by resizing the PTY mid-test

## Inspired By

- [tui-test](https://github.com/microsoft/tui-test) -- Microsoft's TypeScript terminal testing library
