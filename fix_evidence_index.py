import json

def fix_index():
    with open('evidence/index.json', 'r') as f:
        data = json.load(f)

    if isinstance(data.get('items'), list):
        print("Already a list.")
        return

    new_items = []
    for key, value in data['items'].items():
        item = value.copy()
        # Ensure evidence_id is set
        if 'evidence_id' not in item:
            item['evidence_id'] = key
        # If evidence_id was present but different, we trust the key?
        # Usually key == evidence_id.
        item['evidence_id'] = key # Enforce key as ID
        new_items.append(item)

    data['items'] = new_items

    with open('evidence/index.json', 'w') as f:
        json.dump(data, f, indent=2)

    print("Converted to list.")

if __name__ == '__main__':
    fix_index()
