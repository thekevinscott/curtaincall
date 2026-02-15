"""Carriage-return based progress bar."""

import sys
import time

for i in range(0, 101, 20):
    sys.stdout.write(f"\rProgress: {i}%")
    sys.stdout.flush()
    time.sleep(0.2)

sys.stdout.write("\rProgress: 100% Done!\n")
sys.stdout.flush()
