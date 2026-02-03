#!/usr/bin/env python3
import pathlib
import sys

MODULES = ["product", "people", "process", "training", "metrics", "autopilot"]

def main():
    root = pathlib.Path(__file__).resolve().parents[2]
    ok = True

    fixtures_root = root / "fixtures" / "pppt"
    modules_root = root / "modules" / "pppt"

    for m in MODULES:
        # Check if module implementation exists
        module_src = modules_root / m
        if not module_src.exists():
            continue

        m_path = fixtures_root / m
        v = m_path / "valid"
        iv = m_path / "invalid"

        if not v.exists() or not any(v.glob("*.json")):
            print(f"Missing valid fixtures for {m} at {v}", file=sys.stderr)
            ok = False

        if not iv.exists() or len(list(iv.glob("*.json"))) < 2:
            print(f"Need >=2 invalid fixtures for {m} at {iv}", file=sys.stderr)
            ok = False

    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
