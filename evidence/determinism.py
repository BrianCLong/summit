#!/usr/bin/env python3
"""Determinism evidence helper for offline-local profile."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib


def stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, dest="input_text")
    parser.add_argument("--output", required=True, dest="output_text")
    parser.add_argument("--model", required=True)
    parser.add_argument(
        "--evidence-id", default="EVID-LOCAL-001", help="Evidence identifier"
    )
    parser.add_argument(
        "--out", default="stamp.json", help="Output path for determinism stamp"
    )
    args = parser.parse_args()

    stamp = {
        "evidence_id": args.evidence_id,
        "input_hash": stable_hash(args.input_text),
        "output_hash": stable_hash(args.output_text),
        "model": args.model,
    }

    out_path = pathlib.Path(args.out)
    out_path.write_text(json.dumps(stamp, indent=2) + "\n", encoding="utf-8")
    print(f"[determinism] wrote {out_path}")


if __name__ == "__main__":
    main()
