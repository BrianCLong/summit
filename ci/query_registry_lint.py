#!/usr/bin/env python3
import json
import os
import re
import sys


def lint_query(query_meta):
    id = query_meta.get('id')
    phase = query_meta.get('phase')
    cypher = query_meta.get('cypher', '')

    errors = []

    if phase == 'JUSTIFICATION':
        # Rule: No RETURN *
        if re.search(r'RETURN\s+\*', cypher, re.IGNORECASE):
            errors.append(f"[{id}] JUSTIFICATION queries must not use 'RETURN *'. Use explicit projections.")

        # Rule: Mandatory ORDER BY if LIMIT is set
        if re.search(r'LIMIT\s+\d+', cypher, re.IGNORECASE):
            if not re.search(r'ORDER\s+BY', cypher, re.IGNORECASE):
                errors.append(f"[{id}] JUSTIFICATION queries must include 'ORDER BY' when 'LIMIT' is used for determinism.")

        # Rule: max_rows must be set
        if 'max_rows' not in query_meta:
            errors.append(f"[{id}] JUSTIFICATION queries must have 'max_rows' metadata set.")

        # Rule: projection_allowlist must be set
        if 'projection_allowlist' not in query_meta or not query_meta['projection_allowlist']:
            errors.append(f"[{id}] JUSTIFICATION queries must have 'projection_allowlist' metadata set.")

    return errors

def main():
    registry_path = sys.argv[1] if len(sys.argv) > 1 else 'packages/graphrag-core/src/query_registry/registry.json'

    if not os.path.exists(registry_path):
        print(f"Registry file not found: {registry_path}")
        return 0

    try:
        with open(registry_path) as f:
            registry = json.load(f)
    except Exception as e:
        print(f"Failed to load registry: {e}")
        return 1

    all_errors = []
    for query in registry.get('queries', []):
        errors = lint_query(query)
        all_errors.extend(errors)

    if all_errors:
        print("Query Registry Lint Failed:")
        for err in all_errors:
            print(f"  - {err}")
        return 1

    print("Query Registry Lint Passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
