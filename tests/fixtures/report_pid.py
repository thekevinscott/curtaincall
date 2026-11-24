"""Print own pid, then stay alive."""

import os
import time

print(f"PID={os.getpid()}", flush=True)

while True:
    time.sleep(0.1)
