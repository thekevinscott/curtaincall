"""Print terminal size and detect SIGWINCH."""

import os
import signal
import time


def print_size():
    size = os.get_terminal_size()
    print(f"{size.columns}x{size.lines}", flush=True)


def on_resize(_signum, _frame):
    print_size()


signal.signal(signal.SIGWINCH, on_resize)
print_size()

while True:
    time.sleep(0.1)
