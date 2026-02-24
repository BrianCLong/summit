import json
from pathlib import Path

p = Path("evidence/index.json")
data = json.loads(p.read_text())

new_data = {"items": {}}

# The current data is a list of dicts: [{"evidence_id": "...", "files": {...}}, ...]
# We want: {"items": {"EVID_ID": {"files": {...}}}}

if isinstance(data, list):
    for item in data:
        eid = item.get("evidence_id")
        if eid:
            # removing evidence_id from the body as it is the key now
            # but keeping other fields
            body = {k: v for k, v in item.items() if k != "evidence_id"}
            new_data["items"][eid] = body
else:
    print("Data is not a list, maybe already fixed?")
    import sys
    sys.exit(0)

p.write_text(json.dumps(new_data, indent=2) + "\n")
print("Refactored evidence/index.json")
