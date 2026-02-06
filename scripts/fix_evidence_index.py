import json
import os

index_path = 'evidence/index.json'

with open(index_path, 'r') as f:
    data = json.load(f)

changed = False
if 'items' in data:
    for key, item in data['items'].items():
        if 'files' not in item and 'artifacts' in item:
            item['files'] = item['artifacts']
            changed = True
        elif 'files' in item and 'artifacts' not in item:
            # optional: ensure artifacts exists too if needed?
            pass

if changed:
    with open(index_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Fixed {index_path}")
else:
    print(f"No changes needed for {index_path}")
