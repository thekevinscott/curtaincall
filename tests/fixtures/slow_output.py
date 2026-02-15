"""Print lines with delays to test auto-waiting."""

import time

print("line 1", flush=True)
time.sleep(0.3)
print("line 2", flush=True)
time.sleep(0.3)
print("line 3", flush=True)
time.sleep(0.3)
print("done", flush=True)
