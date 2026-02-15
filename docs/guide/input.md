# Input

Curtaincall provides methods for sending text and keyboard input to the terminal.

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
