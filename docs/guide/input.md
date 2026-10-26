# Input

> Published version: [thekevinscott.github.io/curtaincall/guide/input/](https://thekevinscott.github.io/curtaincall/guide/input/)

Curtaincall provides methods for sending text, keyboard, and mouse input to the terminal.

## Text Input

```python
# Send raw text
term.write("hello")

# Send text followed by Enter
term.submit("hello")
```

## Arrow Keys

```python
term.key_up()
term.key_down()
term.key_left()
term.key_right()
```

## Special Keys

```python
term.key_enter()
term.key_backspace()
term.key_delete()
term.key_tab()
term.key_escape()
```

## Control Keys

```python
term.key_ctrl_c()   # Send SIGINT
term.key_ctrl_d()   # Send EOF
```

## Mouse Clicks

```python
# Left-click the first visible match of some text
term.get_by_text("Save").click()

# Left-click a cell by 0-based viewport coordinates
term.click(row=2, col=10)
```

Each click sends an SGR mouse press followed by a release (`\x1b[<0;COL;ROWM` then
`...m`, with the 1-based coordinates SGR expects). The program under test only sees
these events if it has turned on mouse tracking, usually with `\x1b[?1000h\x1b[?1006h`.

`Locator.click()` doesn't wait for the text to appear, so assert it is visible first if
it may not have rendered yet. Matches that have scrolled off into the scrollback buffer
can't be clicked; if those are the only matches, `click()` raises `LookupError`.

```python
expect(term.get_by_text("Save")).to_be_visible()
term.get_by_text("Save").click()
```

## Example: Menu Navigation

```python
def test_menu(terminal):
    term = terminal("python menu.py")
    expect(term.get_by_text("Select")).to_be_visible()

    term.key_down()
    term.key_down()
    term.key_enter()

    expect(term.get_by_text("Option C")).to_be_visible()
```
