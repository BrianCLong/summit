import json
import os
from datetime import datetime

def main():
    with open('evidence/index.json', 'r') as f:
        data = json.load(f)

    items = data.get('items', {})
    valid_keys = ["generated_at_utc", "generated_at", "created_at"]

    for evd_id, files in items.items():
        stamp_file = next((f for f in files if f.endswith('stamp.json')), None)
        if not stamp_file:
            continue

        if not os.path.exists(stamp_file):
            print(f"Skipping missing file: {stamp_file}")
            continue

        with open(stamp_file, 'r') as f:
            stamp = json.load(f)

        if not any(k in stamp for k in valid_keys):
            print(f"Fixing stamp for {evd_id}")
            if "retrieved_at" in stamp:
                stamp["generated_at"] = stamp["retrieved_at"]
            elif "timestamp" in stamp:
                stamp["generated_at"] = stamp["timestamp"]
            else:
                stamp["generated_at"] = datetime.utcnow().isoformat() + "Z"

            with open(stamp_file, 'w') as f:
                json.dump(stamp, f, indent=2)

if __name__ == "__main__":
    main()
