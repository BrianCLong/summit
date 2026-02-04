#!/usr/bin/env python3
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
PACKS_ROOT = ROOT / "prompts" / "packs"


def main() -> int:
    if not PACKS_ROOT.exists():
        print(f"[WARN] {PACKS_ROOT} does not exist")
        return 0

    ok = True
    for pack_yaml in PACKS_ROOT.glob("*/pack.yaml"):
        try:
            data = yaml.safe_load(pack_yaml.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"[FAIL] {pack_yaml}: unable to parse YAML ({exc})")
            ok = False
            continue

        for key in ["id", "version", "templates"]:
            if key not in data:
                print(f"[FAIL] {pack_yaml}: missing {key}")
                ok = False

        templates = data.get("templates", [])
        if not templates:
            print(f"[FAIL] {pack_yaml}: templates list is empty")
            ok = False
            continue

        for template in templates:
            template_id = template.get("id")
            contract = template.get("output_contract")
            if not template_id:
                print(f"[FAIL] {pack_yaml}: template missing id")
                ok = False
                continue
            if not contract:
                print(f"[FAIL] {pack_yaml}: template {template_id} missing output_contract")
                ok = False
            template_path = pack_yaml.parent / "templates" / f"{template_id}.md"
            if not template_path.exists():
                print(f"[FAIL] {pack_yaml}: missing template file {template_path}")
                ok = False

    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
