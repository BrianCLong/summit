import json
import os
from pathlib import Path

for root, _, files in os.walk("evidence"):
    for file in files:
        if file.endswith(".json"):
            path = Path(root) / file
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
            except:
                continue

            modified = False

            def remove_forbidden(d):
                nonlocal modified
                if isinstance(d, dict):
                    keys = list(d.keys())
                    for k in keys:
                        if k in ["timestamp", "date", "created_at", "updated_at", "time", "generated_at_utc"]:
                            del d[k]
                            modified = True
                        else:
                            remove_forbidden(d[k])
                elif isinstance(d, list):
                    for v in d:
                        remove_forbidden(v)

            # For report.json, remove forbidden from the whole file
            if file == "report.json":
                remove_forbidden(data)

            # Re-write the file if it was modified
            if modified:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
