import json
import os

def main():
    with open('evidence/index.json', 'r') as f:
        data = json.load(f)

    new_items = {}

    # Handle the existing list format
    if 'items' in data and isinstance(data['items'], list):
        for item in data['items']:
            ev_id = item['evidence_id']
            files_dict = item.get('files', {})
            # Flatten dict values to list
            file_list = list(files_dict.values())
            new_items[ev_id] = file_list

    # Add new evidence if not present
    new_evidence_id = "EVD-ITT-PRIV-001"
    new_items[new_evidence_id] = [
        "evidence/EVD-ITT-PRIV-001/report.json",
        "evidence/EVD-ITT-PRIV-001/metrics.json",
        "evidence/EVD-ITT-PRIV-001/stamp.json"
    ]

    new_data = {"items": new_items}

    with open('evidence/index.json', 'w') as f:
        json.dump(new_data, f, indent=2)

    print("Transformed evidence/index.json")

if __name__ == "__main__":
    main()
