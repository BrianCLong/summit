#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def enrich_media(input_path: str, backend: str = "dummy", output_dir: str = "."):
    """
    Enrich media using summit-emu3 CLI.
    """
    print(f"Enriching {input_path} using backend={backend}...")

    input_p = Path(input_path)
    output_p = Path(output_dir) / f"{input_p.stem}.evidence.json"

    cmd = [
        sys.executable, "-m", "summit_emu3.cli",
        "--backend", backend,
        "--out", str(output_p),
        "caption", input_path
    ]

    # Ensure module is in path if running from source
    env = os.environ.copy()
    root_dir = Path(__file__).parent.parent.resolve()
    env["PYTHONPATH"] = f"{root_dir}:{env.get('PYTHONPATH', '')}"

    try:
        subprocess.run(cmd, check=True, env=env)
        print(f"Evidence written to {output_p}")
    except subprocess.CalledProcessError as e:
        print(f"Error processing {input_path}: {e}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="Emu3 Ingestion Hook")
    parser.add_argument("input", help="Input media file")
    parser.add_argument("--backend", default="dummy", help="Backend to use")
    parser.add_argument("--out-dir", default=".", help="Output directory")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    enrich_media(args.input, args.backend, args.out_dir)

if __name__ == "__main__":
    main()
