import hashlib
import os
import json

def get_hash(path):
    if not os.path.exists(path): return "missing"
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def main():
    report = {
        "architecture_doc": get_hash("docs/ARCHITECTURE.md"),
        "platform_flags": get_hash("api/platform_spine/flags.py")
    }
    with open("scripts/monitoring/week1-drift.report.json", "w") as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()
