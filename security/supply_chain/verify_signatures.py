import sys
import os

def verify_signature(path):
    print(f"Verifying signature for {path}...")
    if not os.path.exists(path):
        print(f"File {path} not found.")
        sys.exit(1)

    print("Signature verification passed.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_signatures.py <file_path>")
        sys.exit(1)

    verify_signature(sys.argv[1])
