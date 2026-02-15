"""Emit many lines rapidly to test large output bursts."""

for i in range(200):
    print(f"line-{i:04d}")
print("DONE", flush=True)
