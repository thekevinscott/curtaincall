"""Clickable labels using SGR mouse tracking.

Usage: mouse_click.py [FILLER_LINES]

Prints FILLER_LINES lines (pushing "Beta filler" text into scrollback), clears
the viewport, then draws labels at fixed 0-based positions. Reports which
label a full press + release landed on, or "none" if it missed.
"""

import os
import re
import sys
import termios
import tty

LABELS = {"Alpha": (2, 10), "Beta": (4, 20)}  # label -> (row, col), 0-based
SGR_EVENT = re.compile(r"\x1b\[<(\d+);(\d+);(\d+)([Mm])")

filler = int(sys.argv[1]) if len(sys.argv) > 1 else 0
rows = os.get_terminal_size().lines


def out(text):
    sys.stdout.write(text)
    sys.stdout.flush()


def status(text):
    out(f"\033[{rows};1H\033[2K{text}")


def label_at(row, col):
    for label, (r, c) in LABELS.items():
        if row == r and c <= col < c + len(label):
            return label
    return "none"


for i in range(filler):
    out(f"Beta filler {i}\r\n")
out("\033[2J")
for label, (r, c) in LABELS.items():
    out(f"\033[{r + 1};{c + 1}H{label}")
out("\033[?1000h\033[?1006h")

fd = sys.stdin.fileno()
old = termios.tcgetattr(fd)
try:
    tty.setraw(fd)
    status("ready")
    pending = ""
    pressed = None
    while True:
        ch = os.read(fd, 64).decode()
        if "\x03" in ch:
            break
        pending += ch
        for m in SGR_EVENT.finditer(pending):
            button, col, row, kind = int(m[1]), int(m[2]) - 1, int(m[3]) - 1, m[4]
            if kind == "M":
                pressed = (button, row, col)
            elif pressed == (button, row, col):
                status(f"Clicked: {label_at(row, col)} (button {button})")
                pressed = None
        pending = SGR_EVENT.sub("", pending)
finally:
    out("\033[?1006l\033[?1000l")
    termios.tcsetattr(fd, termios.TCSADRAIN, old)
