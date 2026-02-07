import json

def main():
    with open('evidence/index.json', 'r') as f:
        data = json.load(f)

    items = data.get('items', {})
    valid_items = {}

    files_to_avoid = [
        "evidence/report.json",
        "evidence/metrics.json",
        "evidence/stamp.json",
        "summit/evidence/templates/report.json",
        "summit/evidence/templates/metrics.json",
        "summit/evidence/templates/stamp.json"
    ]

    for evd_id, files in items.items():
        # Keep EVD-ITT-PRIV-001
        if evd_id == "EVD-ITT-PRIV-001":
            valid_items[evd_id] = files
            continue

        # Check if files point to avoided paths
        if any(f in files_to_avoid for f in files):
            print(f"Removing {evd_id} (points to shared/template file)")
            continue

        valid_items[evd_id] = files

    data['items'] = valid_items

    with open('evidence/index.json', 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Cleaned index. Removed {len(items) - len(valid_items)} items.")

if __name__ == "__main__":
    main()
