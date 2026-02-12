import json
from pathlib import Path

p = Path("evidence/index.json")
data = json.loads(p.read_text(encoding="utf-8"))

if "items" not in data or not data["items"]:
    if "evidence" in data:
        data["items"] = data["evidence"]
        print("Migrated 'evidence' to 'items'")
    else:
        print("No 'evidence' key found to migrate")
        # Creating dummy item to pass the "non-empty" check if strictly needed,
        # but better to rely on real data if possible.
        # If 'evidence' is empty, we might have a problem.
        if not data.get("items"):
             # Add a dummy item if totally empty to pass the check?
             # The check says: "must contain non-empty 'items' map"
             # Let's see if 'evidence' was non-empty.
             pass

p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
