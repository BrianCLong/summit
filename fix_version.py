import json
import re

try:
    with open("evidence/index.json") as f:
        data = json.load(f)

    data["version"] = 1.0

    with open("evidence/index.json", "w") as f:
        json.dump(data, f, indent=2)

    print("Updated version to number")
except Exception as e:
    print(f"Error: {e}")
