# Curtaincall

Testing library for terminal applications.

Curtaincall is a pytest plugin for testing terminal (TUI) applications. It spawns real PTY sessions, emulates a VT100 terminal, and provides an expressive assertion API with auto-waiting locators. Inspired by Microsoft's [tui-test](https://github.com/microsoft/tui-test).

**[Full documentation](https://thekevinscott.github.io/curtaincall/)**

## Installation

```bash
pip install curtaincall
```

The `terminal` fixture is automatically available when curtaincall is installed -- no imports or configuration needed.

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
```

## How It Works

1. `terminal("python my_cli.py")` spawns the command in a real pseudo-terminal (PTY) via [pexpect](https://github.com/pexpect/pexpect)
2. A background thread reads PTY output and feeds it through a VT100 emulator ([pyte](https://github.com/selectel/pyte))
3. `get_by_text("...")` creates a lazy locator that searches the emulated screen
4. `expect(...).to_be_visible()` polls the screen until the text appears or times out

Tests automatically wait for output to appear -- no `time.sleep()` needed.

## Features

### Auto-waiting Assertions

Every assertion polls the terminal screen with a configurable timeout (default 5 seconds). When an assertion times out, the error includes the current screen content for debugging.

```python
from curtaincall import expect

# Wait for text to appear
expect(term.get_by_text("Ready")).to_be_visible()

# Wait for text to disappear (spinner finished, loading complete)
expect(term.get_by_text("Loading")).not_to_be_visible()

# Custom timeout for slow operations
expect(term.get_by_text("Done")).to_be_visible(timeout=30.0)
```

Failure output:

```
AssertionError: Expected text to be visible: 'MISSING'

Screen content:
$ python my_app.py
Hello, World!
$
```

### Locators

Locators find text on the terminal screen. They are lazy -- the screen isn't searched until the locator is used.

```python
import re

# Substring match (default)
term.get_by_text("Hello")

# Full line match (stripped line must equal the text exactly)
term.get_by_text("Hello, World!", full=True)

# Regex match
term.get_by_text(re.compile(r"version \d+\.\d+"))

# Regex with full line match
term.get_by_text(re.compile(r"Hello, \w+!"), full=True)
```

Locator properties:

```python
locator = term.get_by_text("Hello")
locator.is_visible()   # bool -- instant check, no waiting
locator.cells          # list[CellMatch] -- matched cell positions
locator.text()         # str -- the matched text content
```

### Color Assertions

Verify foreground and background colors of terminal text. Supports standard terminal color names.

```python
expect(term.get_by_text("ERROR")).to_have_fg_color("red")
expect(term.get_by_text("OK")).to_have_fg_color("green")
expect(term.get_by_text("HIGHLIGHT")).to_have_bg_color("blue")
```

Supported colors: `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `white`, `black`, `default`.

### Text Content Assertions

```python
expect(term.get_by_text("Hello, World!")).to_contain_text("World")
```

### Keyboard Input

Send text, arrow keys, and control sequences to the terminal.

```python
# Text input
term.write("raw text")           # send raw text
term.submit("text + enter")      # send text followed by Enter

# Arrow keys
term.key_up()
term.key_down()
term.key_left()
term.key_right()

# Special keys
term.key_enter()
term.key_backspace()
term.key_delete()
term.key_tab()
term.key_escape()

# Control keys
term.key_ctrl_c()    # send SIGINT
term.key_ctrl_d()    # send EOF
```

### Terminal Resize

Test SIGWINCH handling by resizing the PTY mid-test. Both the PTY and the internal VT100 emulator are resized together.

```python
def test_resize(terminal):
    term = terminal("python my_app.py", rows=24, cols=80)
    expect(term.get_by_text("80x24")).to_be_visible()
    term.set_size(rows=40, cols=120)
    expect(term.get_by_text("120x40")).to_be_visible()
```

### Snapshot Testing

Serialize the terminal screen as a box-drawn string for snapshot regression testing.

```python
def test_table_output(terminal):
    term = terminal("python my_app.py", rows=10, cols=40)
    expect(term.get_by_text("Results")).to_be_visible()
    snapshot = term.to_snapshot()
```

Output format:

```
╭──────────────────────────────────────╮
│$ python my_app.py                    │
│Results                               │
│                                      │
╰──────────────────────────────────────╯
```

Pair with [syrupy](https://github.com/toptal/syrupy) for automatic snapshot management:

```python
def test_table_output(terminal, snapshot):
    term = terminal("python my_app.py", rows=10, cols=40)
    expect(term.get_by_text("Results")).to_be_visible()
    assert term.to_snapshot() == snapshot
```

Update snapshots with `pytest --snapshot-update`.

### Screen Inspection

```python
# Full buffer as 2D list of characters
buffer = term.get_buffer()         # list[list[str]]

# Cursor position
cursor = term.get_cursor()         # CursorPosition(x=0, y=5)
```

## The `terminal` Fixture

The `terminal` fixture is a factory function that creates isolated PTY sessions.

```python
def test_example(terminal):
    # Default: 30 rows, 80 columns
    term = terminal("python my_app.py")

    # Custom dimensions
    term = terminal("python my_app.py", rows=24, cols=120)

    # Custom environment variables
    term = terminal("python my_app.py", env={"DEBUG": "1"})
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `command` | `str` | required | Shell command to run |
| `rows` | `int` | `30` | Terminal height |
| `cols` | `int` | `80` | Terminal width |
| `env` | `dict` | `None` | Extra environment variables |

### Multiple Terminals

Create multiple terminals in a single test:

```python
def test_client_server(terminal):
    server = terminal("python server.py")
    client = terminal("python client.py")
    expect(server.get_by_text("Listening")).to_be_visible()
    expect(client.get_by_text("Connected")).to_be_visible()
```

### Cleanup

All terminals are automatically killed when the test ends. Long-running processes are force-terminated.

## Example: Menu Navigation

```python
from curtaincall import expect

def test_arrow_menu(terminal):
    term = terminal("python menu.py")
    expect(term.get_by_text("Select an option:")).to_be_visible()

    term.key_down()
    term.key_down()
    term.key_enter()

    expect(term.get_by_text("Option C")).to_be_visible()
```

## Example: Signal Handling

```python
from curtaincall import expect

def test_ctrl_c(terminal):
    term = terminal("python server.py")
    expect(term.get_by_text("Running")).to_be_visible()

    term.key_ctrl_c()

    expect(term.get_by_text("Cleanup complete")).to_be_visible()
```

## Requirements

- Python 3.12+
- Linux or macOS (requires Unix PTYs)

## Dependencies

Runtime: [pexpect](https://github.com/pexpect/pexpect), [pyte](https://github.com/selectel/pyte)

## Documentation

Full documentation at [thekevinscott.github.io/curtaincall](https://thekevinscott.github.io/curtaincall/).

## License

MIT
