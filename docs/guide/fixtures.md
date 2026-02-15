# Fixtures

## The terminal Fixture

The `terminal` fixture is a factory function that creates isolated PTY sessions. It's automatically available when curtaincall is installed.

```python
def test_example(terminal):
    term = terminal("python my_app.py")
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `command` | `str` | required | Shell command to run |
| `rows` | `int` | `30` | Terminal height |
| `cols` | `int` | `80` | Terminal width |
| `env` | `dict` | `None` | Extra environment variables |

### Multiple Terminals

You can create multiple terminals in a single test:

```python
def test_multiple(terminal):
    server = terminal("python server.py")
    client = terminal("python client.py")

    expect(server.get_by_text("Listening")).to_be_visible()
    expect(client.get_by_text("Connected")).to_be_visible()
```

### Cleanup

All terminals created by the fixture are automatically killed when the test ends. Long-running processes are force-terminated.
