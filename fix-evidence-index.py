import json
import sys

def main():
    try:
        with open('evidence/index.json', 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return

    # Memory says: "The evidence/index.json file must contain a non-empty items dictionary (mapping Evidence IDs to metadata), strictly avoiding array formats to pass tools/ci/verify_evidence.py."
    # Currently it seems `data` has a top level array or an object with an array under `items`? Let's check `data` structure
    if 'items' in data and isinstance(data['items'], list):
        items_dict = {}
        for item in data['items']:
            if 'evidence_id' in item:
                evd_id = item['evidence_id']
                # Copy other attributes
                metadata = {k: v for k, v in item.items() if k != 'evidence_id'}
                items_dict[evd_id] = metadata
            else:
                print("Item missing evidence_id")

        data['items'] = items_dict

    try:
        with open('evidence/index.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("Successfully updated evidence/index.json")
    except Exception as e:
        print(f"Error writing JSON: {e}")

if __name__ == '__main__':
    main()
