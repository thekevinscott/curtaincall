# Terminal

> Published version: [thekevinscott.github.io/curtaincall/guide/terminal/](https://thekevinscott.github.io/curtaincall/guide/terminal/)

The `Terminal` class manages a child process running in a pseudo-terminal with VT100 emulation.

## Creating Terminals

Use the `terminal` fixture (a factory function):

```python
def test_example(terminal):
    # Default: 30 rows, 80 columns
    term = terminal("python my_app.py")

    # Custom dimensions
    term = terminal("python my_app.py", rows=24, cols=120)

    # Custom environment variables
    term = terminal("python my_app.py", env={"DEBUG": "1"})

    # Working directory for the command
    term = terminal("python my_app.py", cwd="path/to/project")
    # Exact environment: skip the parent's variables
    term = terminal("python my_app.py", env={"PATH": "/usr/bin"}, inherit_env=False)
```

## Reading the Screen

```python
# Full buffer as 2D list of characters
buffer = term.get_buffer()      # list[list[str]]

# Visible portion (same as get_buffer for now)
visible = term.get_viewable_buffer()

# Screen as string (for debugging)
text = term._get_screen_text()
```

## Cursor Position

```python
cursor = term.get_cursor()  # CursorPosition(x=0, y=5)
print(cursor.x, cursor.y)
```

## Resizing

```python
term.set_size(rows=40, cols=120)
```

The child process receives a SIGWINCH signal, just like a real terminal resize.

## Signals

`term.pid` is the child's process id. `term.signal()` sends it a signal:

```python
import signal

term.signal(signal.SIGSTOP)  # suspend, like Ctrl-Z
term.signal(signal.SIGCONT)  # resume, like fg
```

The signal goes to the child pid only, not its process group. With `suppress_stderr=True` the child is the `bash -c` wrapper.

## Cleanup

Terminals are automatically killed when the test ends (via the fixture). You can also kill manually:

```python
term.kill()
```
