#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from tools.flagctl.simple_yaml import load as load_yaml

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "flags" / "catalog.yaml"
TARGETS = ROOT / "flags" / "targets"


def main() -> int:
    catalog_doc = load_yaml(CATALOG.read_text()) if CATALOG.exists() else {}
    catalog = (
        {item["key"] for item in (catalog_doc.get("flags") or [])}
        if isinstance(catalog_doc.get("flags"), list)
        else set()
    )
    exit_code = 0
    for env_file in TARGETS.glob("*.yaml"):
        data = load_yaml(env_file.read_text()) or {}
        for key in data.get("flags") or {}:
            if key not in catalog:
                print(f"flag {key} missing from catalog.yaml", file=sys.stderr)
                exit_code = 1
    if exit_code:
        print("flag validation failed", file=sys.stderr)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
