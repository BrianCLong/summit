#!/usr/bin/env python3
import json
import pathlib
import sys
import yaml
from collections import OrderedDict

ROOT = pathlib.Path(__file__).resolve().parents[1]
MAPPING_FILE = ROOT / "mappings" / "otel_to_prov.yml"
OUT_FILE = ROOT / "spec" / "prov_context.jsonld"

def main():
    if not MAPPING_FILE.exists():
        print(f"Error: {MAPPING_FILE} not found.")
        return 1

    with open(MAPPING_FILE, "r") as f:
        data = yaml.safe_load(f)

    # Build context
    ctx = OrderedDict()
    ctx["@version"] = data.get("version", 1.1)

    # Add prefixes
    prefixes = data.get("prefixes", {})
    for prefix, uri in sorted(prefixes.items()):
        ctx[prefix] = uri

    # Standard JSON-LD keywords
    ctx["id"] = "@id"
    ctx["type"] = "@type"

    # Add mappings
    mappings = data.get("mappings", {})
    for term, definition in sorted(mappings.items()):
        if isinstance(definition, dict):
            # Convert YAML keys to JSON-LD context keys
            # id -> @id, type -> @type
            new_def = OrderedDict()
            if "id" in definition:
                new_def["@id"] = definition["id"]
            if "type" in definition:
                new_def["@type"] = definition["type"]
            ctx[term] = new_def
        else:
            ctx[term] = definition

    full_context = OrderedDict([("@context", ctx)])

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Write deterministically: stable key order (sorted above), minimal separators
    content = json.dumps(full_context, separators=(",", ":"), ensure_ascii=False) + "\n"
    OUT_FILE.write_text(content, encoding="utf-8")
    print(f"✓ Generated {OUT_FILE} from {MAPPING_FILE}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
