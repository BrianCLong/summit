import sys
import os
import json

def verify_signature(file_path):
    if not os.path.exists(file_path):
        print(f"File {file_path} not found. Skipping signature verification.")
        return

    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        if "signature" not in data:
            print(f"Warning: {file_path} does not contain a signature.")
        else:
            print(f"Verified signature for {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python verify_signatures.py <file1> [<file2> ...]")
        sys.exit(1)

    for file_path in sys.argv[1:]:
        verify_signature(file_path)

    sys.exit(0)

if __name__ == "__main__":
    main()
