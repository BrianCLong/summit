import json
import os

def main():
    with open('evidence/index.json', 'r') as f:
        data = json.load(f)

    items = data.get('items', {})

    for evd_id, files in items.items():
        for fname in files:
            if fname.endswith('stamp.json'):
                if not os.path.exists(fname):
                    continue

                with open(fname, 'r') as f:
                    content = json.load(f)

                if content.get("evidence_id") != evd_id:
                    print(f"Fixing ID for {fname}")
                    content["evidence_id"] = evd_id

                    with open(fname, 'w') as f:
                        json.dump(content, f, indent=2)

if __name__ == "__main__":
    main()
