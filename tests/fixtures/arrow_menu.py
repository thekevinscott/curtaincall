"""Simple arrow-key menu using raw terminal input."""

import sys
import termios
import tty

options = ["Option A", "Option B", "Option C"]
selected = 0


def render():
    # Move cursor to top and redraw
    sys.stdout.write("\033[H\033[J")  # clear screen
    sys.stdout.write("Select an option:\n")
    for i, opt in enumerate(options):
        prefix = "> " if i == selected else "  "
        sys.stdout.write(f"{prefix}{opt}\n")
    sys.stdout.flush()


fd = sys.stdin.fileno()
old = termios.tcgetattr(fd)
try:
    tty.setraw(fd)
    render()
    while True:
        ch = sys.stdin.read(1)
        if ch == "\x1b":
            seq = sys.stdin.read(2)
            if seq == "[A":  # up
                selected = max(0, selected - 1)
                render()
            elif seq == "[B":  # down
                selected = min(len(options) - 1, selected + 1)
                render()
        elif ch in ("\r", "\x03"):  # enter or ctrl-c
            break
finally:
    termios.tcsetattr(fd, termios.TCSADRAIN, old)
    sys.stdout.write(f"\nSelected: {options[selected]}\n")
    sys.stdout.flush()
