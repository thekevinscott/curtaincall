"""Trap SIGINT, print Cleanup, exit 130."""

import signal
import sys
import time


def handler(_signum, _frame):
    print("Cleanup", flush=True)
    sys.exit(130)


signal.signal(signal.SIGINT, handler)
print("Running", flush=True)

# Keep alive until interrupted
while True:
    time.sleep(0.1)
