# Snapshots

Curtaincall can serialize the terminal screen as a box-drawn string for snapshot testing.

## Basic Usage

```python
def test_table_output(terminal):
    term = terminal("python my_app.py table", rows=10, cols=40)
    expect(term.get_by_text("Results")).to_be_visible()
    snapshot = term.to_snapshot()
```

The snapshot looks like:

```
+----------------------------------------+
|$ python my_app.py table                |
|+----------+-------+                    |
|| Name     | Score |                    |
|+----------+-------+                    |
|| Alice    |    95 |                    |
|+----------+-------+                    |
|Results                                 |
|                                        |
|                                        |
+----------------------------------------+
```

## With Syrupy

Pair `to_snapshot()` with [syrupy](https://github.com/toptal/syrupy) for automatic snapshot management:

```python
def test_table_output(terminal, snapshot):
    term = terminal("python my_app.py table", rows=10, cols=40)
    expect(term.get_by_text("Results")).to_be_visible()
    assert term.to_snapshot() == snapshot
```

Update snapshots with `pytest --snapshot-update`.
