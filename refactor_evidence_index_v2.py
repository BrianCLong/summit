import json
from pathlib import Path

p = Path("evidence/index.json")
data = json.loads(p.read_text())

# We want: {"items": {"EVID_ID": {"files": {...}}}}

if isinstance(data, dict):
    if isinstance(data.get("items"), list):
        print("Refactoring items list to dict...")
        new_items = {}
        for item in data["items"]:
            eid = item.get("evidence_id")
            if eid:
                body = {k: v for k, v in item.items() if k != "evidence_id"}
                new_items[eid] = body
        data["items"] = new_items
        p.write_text(json.dumps(data, indent=2) + "\n")
        print("Done.")
    else:
        print("Items is already not a list.")
else:
    print("Data is not a dict.")
