import json
from pathlib import Path

path = Path("evidence/index.json")
try:
    content = json.loads(path.read_text())
    items_list = content.get("items", [])

    if isinstance(items_list, list):
        items_dict = {}
        for item in items_list:
            if "evidence_id" in item:
                eid = item.pop("evidence_id")
                items_dict[eid] = item

        content["items"] = items_dict
        path.write_text(json.dumps(content, indent=2) + "\n")
        print("Converted items list to dict.")
    else:
        print("items is already a dict or invalid.")

except Exception as e:
    print(f"Error: {e}")
