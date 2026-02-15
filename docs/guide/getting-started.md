# Getting Started

## Installation

```bash
pip install curtaincall
```

Curtaincall registers itself as a pytest plugin automatically. The `terminal` fixture is available in any test file without imports.

## Your First Test

Create a simple CLI program to test:

```python title="my_cli.py"
name = input("What's your name? ")
print(f"Hello, {name}!")
```

Write a test:

```python title="test_my_cli.py"
from curtaincall import expect

def test_greeting(terminal):
    term = terminal("python my_cli.py")
    expect(term.get_by_text("What's your name?")).to_be_visible()
    term.submit("World")
    expect(term.get_by_text("Hello, World!")).to_be_visible()
```

Run with pytest:

```bash
pytest test_my_cli.py -v
```

## How It Works

1. `terminal("python my_cli.py")` spawns the command in a real pseudo-terminal (PTY)
2. A background thread reads the PTY output and feeds it through a VT100 emulator (pyte)
3. `get_by_text("...")` creates a lazy locator that searches the emulated screen
4. `expect(...).to_be_visible()` polls the screen until the text appears (or times out after 5 seconds)

This means your tests automatically wait for output to appear -- no `time.sleep()` needed.
