import json
import sys
import os

# Ensure the root of the repository is in the sys.path so we can import 'intelgraph'
sys.path.insert(0, os.getcwd())

try:
    from intelgraph import IntelCraftElement
except ImportError as e:
    print(f"Error importing intelgraph: {e}")
    print(f"Current sys.path: {sys.path}")
    sys.exit(1)

def main():
    filepath = 'ingest/templates/io_snapshot_2026.json'
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        sys.exit(1)

    with open(filepath, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            sys.exit(1)

    print(f"Verifying {len(data)} elements from {filepath}...")
    success_count = 0
    for item in data:
        try:
            element = IntelCraftElement.from_dict(item)
            # print(f"  OK: {element.element_id} ({element.category})")
            success_count += 1
        except Exception as e:
            print(f"  FAILED: {item.get('element_id', 'unknown')} - {str(e)}")
            sys.exit(1)

    print(f"Successfully verified {success_count} elements.")
    print("Ingest template is valid and compatible with IntelGraph.")

if __name__ == "__main__":
    main()
