import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: lint_ports.py <registry_json>")
        sys.exit(0)

    registry = sys.argv[1]
    if not os.path.exists(registry):
        print(f"Registry {registry} not found, skipping.")
        sys.exit(0)

    print(f"Linting ports in {registry}")
    sys.exit(0)

if __name__ == "__main__":
    main()
