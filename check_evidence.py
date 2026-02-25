import json
import os
import sys

try:
    with open('evidence/index.json', 'r') as f:
        index = json.load(f)
except FileNotFoundError:
    print("evidence/index.json not found")
    sys.exit(1)

missing = []
items = index.get('evidence', []) or index.get('items', []) # Handle both schema versions if needed, though memory said 'evidence' or 'items' key.
# Actually, looking at the previous turn output, it's a dict where keys are IDs and values are objects.
# The output showed: "EVD-MITTR-AIMEM-PRIV-EGRESS-005": { ... "files": { ... } }

if isinstance(items, dict):
    # It's a dict of evidence items
    iterator = items.values()
elif isinstance(items, list):
    iterator = items
else:
    # Maybe the top level keys are the IDs if 'evidence' key doesn't exist?
    # Let's re-examine the cat output from previous turn.
    # It looked like a direct dict.
    iterator = index.values()

for item in iterator:
    if not isinstance(item, dict): continue
    files = item.get('files', {})
    for key, path in files.items():
        if not os.path.exists(path):
            missing.append(path)

if missing:
    print("Missing evidence files:")
    for m in missing:
        print(m)
    sys.exit(1)
else:
    print("All evidence files present.")
