"""Read lines from stdin and echo them back."""

import sys

print("ready>", flush=True)
for line in sys.stdin:
    text = line.strip()
    if text == "quit":
        break
    print(f"echo: {text}", flush=True)
print("bye", flush=True)
