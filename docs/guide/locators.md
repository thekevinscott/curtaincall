# Locators

Locators find text on the terminal screen. They are lazy -- the screen isn't searched until the locator is used.

## String Matching

```python
# Substring match (default)
locator = term.get_by_text("Hello")

# Full line match (stripped line must equal the text exactly)
locator = term.get_by_text("Hello, World!", full=True)
```

## Regex Matching

```python
import re

locator = term.get_by_text(re.compile(r"version \d+\.\d+"))
locator = term.get_by_text(re.compile(r"Hello, \w+!"), full=True)
```

## Locator Properties

```python
locator.is_visible()   # bool -- instant check, no waiting
locator.cells          # list[CellMatch] -- matched cell positions
locator.text()         # str -- the matched text content
```

## Using with expect()

Locators are primarily consumed by `expect()` for auto-waiting assertions:

```python
from curtaincall import expect

expect(term.get_by_text("Ready")).to_be_visible()
expect(term.get_by_text("Loading")).not_to_be_visible()
```
