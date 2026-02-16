"""Emit multiple stderr warnings before printing stdout content.

Reproduces the scenario from issue #1: stderr warnings filling the
visible viewport and pushing stdout content into scrollback.
"""

import sys

# Emit enough warnings to fill a small terminal viewport
for i in range(20):
    print(f"WARNING {i}: something went wrong", file=sys.stderr, flush=True)

# The actual content we care about
print("Usage: my-tool [OPTIONS] COMMAND", flush=True)
print("  --help   Show this message", flush=True)
print("STDERR_DONE", flush=True)
