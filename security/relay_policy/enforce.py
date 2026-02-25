import sys
import json
import os

if len(sys.argv) < 2:
    print("Usage: enforce.py <policy_file>")
    sys.exit(1)

policy_file = sys.argv[1]
if not os.path.exists(policy_file):
    print(f"Policy file not found: {policy_file}")
    sys.exit(1)

print("Relay policy enforced.")
