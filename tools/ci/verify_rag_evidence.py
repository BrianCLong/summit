#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def fail(msg: str) -> None:
    print(f"[verify_rag_evidence] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)

def load_json(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"cannot read/parse {p}: {e}")

def main() -> None:
    idx_path = ROOT / "evidence" / "index.json"
    if not idx_path.exists():
        fail("missing evidence/index.json")

    idx = load_json(idx_path)
    items = idx.get("items", {})

    if not isinstance(items, dict):
        fail("evidence/index.json 'items' must be a dictionary")

    rag_items_found = 0

    for evd_id, meta in items.items():
        if not evd_id.startswith("EVD-RAGSHRED-"):
            continue

        rag_items_found += 1
        print(f"Verifying {evd_id}...")

        # Handle 'files' list (preferred for RAG items)
        files = meta.get("files", [])
        # Also check 'artifacts' list if present (legacy compat, but RAG items use 'files' per my plan)
        if "artifacts" in meta and isinstance(meta["artifacts"], list):
             files.extend(meta["artifacts"])

        if not files:
             fail(f"{evd_id} has no files listed")

        for f in files:
            fp = ROOT / f
            if not fp.exists():
                fail(f"{evd_id} missing file: {f}")

            # If the file is a schema, try to parse it
            if f.endswith(".schema.json"):
                try:
                    load_json(fp)
                    print(f"  - Verified schema JSON: {f}")
                except Exception as e:
                    fail(f"{evd_id} invalid schema JSON {f}: {e}")
            else:
                print(f"  - Verified existence: {f}")

    if rag_items_found == 0:
        fail("No EVD-RAGSHRED-* items found in evidence/index.json")

    print(f"[verify_rag_evidence] OK: Verified {rag_items_found} RAG evidence items.")

if __name__ == "__main__":
    main()
