#!/usr/bin/env python3
"""Audit the alignment between code-level debt markers (TODO/FIXME) and the debt registry.

This script scans the codebase for debt markers using logic from todo_inventory.py
and compares the results against debt/registry.json. It identifies:
1. Untracked Debt: Markers in code not present in the registry.
2. Stale Registry Entries: Registry entries that point to non-existent markers.
"""

import json
import sys
from pathlib import Path

# Add scripts directory to path to import todo_inventory
sys.path.append(str(Path(__file__).parent))
try:
    from todo_inventory import walk_paths, DEFAULT_MARKERS
except ImportError:
    print("Error: Could not import todo_inventory. Ensure scripts/todo_inventory.py exists.")
    sys.exit(1)

REGISTRY_PATH = Path("debt/registry.json")

def load_registry(path: Path) -> dict:
    if not path.exists():
        return {"debt": []}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def normalize_path(path_str: str) -> str:
    """Normalize path to be relative to repo root if possible."""
    p = Path(path_str)
    try:
        return str(p.relative_to(Path.cwd()))
    except ValueError:
        return str(p)

def main():
    print(f"Scanning codebase for markers: {', '.join(DEFAULT_MARKERS)}...")
    code_debt_items = list(walk_paths(Path("."), DEFAULT_MARKERS))

    print(f"Loading registry from {REGISTRY_PATH}...")
    registry = load_registry(REGISTRY_PATH)

    # Create a set of "path:line" strings for quick lookup from code scan
    # Note: line numbers can shift, so exact matching is brittle, but it's the current standard.
    code_locations = set()
    for item in code_debt_items:
        # todo_inventory returns absolute paths in 'path' if run with absolute root,
        # or relative if run with relative. Let's normalize.
        rel_path = normalize_path(item['path'])
        loc = f"{rel_path}:{item['line']}"
        code_locations.add(loc)
        item['_normalized_loc'] = loc  # Store for later

    # Create a set of "path:line" strings from registry
    registry_locations = set()
    for debt in registry.get('debt', []):
        for loc in debt.get('locations', []):
            registry_locations.add(loc)

    # analyze gaps
    untracked_debt = []
    for item in code_debt_items:
        if item['_normalized_loc'] not in registry_locations:
            untracked_debt.append(item)

    stale_entries = []
    for loc in registry_locations:
        if loc not in code_locations:
            stale_entries.append(loc)

    # Report
    print("\n=== Debt Alignment Audit ===")
    print(f"Total markers in code: {len(code_debt_items)}")
    print(f"Total locations in registry: {len(registry_locations)}")

    print(f"\n[ERROR] Untracked Debt Items (in code, not in registry): {len(untracked_debt)}")
    print(f"[WARN] Stale Registry Entries (in registry, not in code): {len(stale_entries)}")

    report = {
        "summary": {
            "total_code_markers": len(code_debt_items),
            "total_registry_locations": len(registry_locations),
            "untracked_debt_count": len(untracked_debt),
            "stale_registry_count": len(stale_entries)
        },
        "untracked_debt": untracked_debt,
        "stale_entries": stale_entries
    }

    output_path = Path("debt/audit_report.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\nDetailed report saved to {output_path}")

    if untracked_debt:
        print("\nTop 5 Untracked Items:")
        for item in untracked_debt[:5]:
            print(f"  {item['_normalized_loc']}: {item['text'][:60]}...")

if __name__ == "__main__":
    main()
