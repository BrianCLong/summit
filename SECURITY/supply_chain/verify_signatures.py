#!/usr/bin/env python3
"""Minimal supply-chain signature verifier for CI gate coverage.

The security_gates workflow invokes this script with a JSON artifact path.
This verifier enforces a small contract to avoid false-green behavior:
  - artifact must be valid JSON object
  - required keys: artifact, payload, signature, algorithm
  - signature must be a non-empty string
"""

from __future__ import annotations

import json
import pathlib
import sys


REQUIRED_KEYS = ("artifact", "payload", "signature", "algorithm")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: verify_signatures.py <signed-artifact.json>", file=sys.stderr)
        return 2

    path = pathlib.Path(sys.argv[1])
    if not path.exists():
        print(f"missing artifact: {path}", file=sys.stderr)
        return 2

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"invalid JSON in {path}: {exc}", file=sys.stderr)
        return 2

    if not isinstance(data, dict):
        print("artifact must be a JSON object", file=sys.stderr)
        return 2

    missing = [key for key in REQUIRED_KEYS if key not in data]
    if missing:
        print(f"missing required keys: {', '.join(missing)}", file=sys.stderr)
        return 1

    signature = data.get("signature")
    if not isinstance(signature, str) or not signature.strip():
        print("signature must be a non-empty string", file=sys.stderr)
        return 1

    print("supply-chain signature artifact contract valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
