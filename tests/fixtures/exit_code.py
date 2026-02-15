"""Exit with the given exit code."""

import sys

code = int(sys.argv[1]) if len(sys.argv) > 1 else 0
sys.exit(code)
