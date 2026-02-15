"""Print environment variables for verification."""

import os

print(f"TERM={os.environ.get('TERM', 'unset')}")
print(f"CC_TEST={os.environ.get('CC_TEST', 'unset')}")
print("ENV_DONE", flush=True)
