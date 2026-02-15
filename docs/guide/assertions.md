# Assertions

Curtaincall's `expect()` function provides assertions with automatic polling.

## Visibility

```python
from curtaincall import expect

# Wait for text to appear (default timeout: 5s)
expect(term.get_by_text("Ready")).to_be_visible()

# Wait for text to disappear
expect(term.get_by_text("Loading")).not_to_be_visible()

# Custom timeout
expect(term.get_by_text("Slow operation")).to_be_visible(timeout=10.0)
```

## Color Assertions

```python
expect(term.get_by_text("ERROR")).to_have_fg_color("red")
expect(term.get_by_text("OK")).to_have_fg_color("green")
expect(term.get_by_text("HIGHLIGHT")).to_have_bg_color("blue")
```

Supported color names: `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `white`, `black`, `default`.

## Text Content

```python
expect(term.get_by_text("Hello, World!")).to_contain_text("World")
```

## Failure Messages

When an assertion times out, the error includes the current screen content:

```
AssertionError: Expected text to be visible: 'MISSING'

Screen content:
$ python my_app.py
Hello, World!
$
```
