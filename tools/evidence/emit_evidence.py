import argparse
import json
import os
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Emit evidence artifact")
    parser.add_argument("--id", required=True, help="Evidence ID")
    parser.add_argument("--type", choices=["report", "metrics", "stamp"], required=True)
    parser.add_argument("--content", required=True, help="JSON content string")
    parser.add_argument("--out-dir", default="evidence", help="Output directory")
    args = parser.parse_args()

    out_dir = Path(args.out_dir) / args.id
    out_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{args.type}.json"
    content = json.loads(args.content)

    with open(out_dir / filename, "w") as f:
        json.dump(content, f, indent=2, sort_keys=True)

    print(f"Emitted {out_dir / filename}")

if __name__ == "__main__":
    main()
