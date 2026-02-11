#!/usr/bin/env python3
import argparse
import json
import sys
from collections import Counter


def load(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def resource_key(resource_change):
    address = resource_change.get("address")
    if address:
        return address
    return f"{resource_change.get('type')}[{resource_change.get('name')}]"


def summarize(manifest):
    types = Counter([resource_change.get("type", "unknown") for resource_change in manifest])
    return {
        "resource_count": len(manifest),
        "types": dict(types),
    }


def diff_structural(manifest_a, manifest_b):
    keys_a = {resource_key(change) for change in manifest_a}
    keys_b = {resource_key(change) for change in manifest_b}
    return {
        "only_in_a": sorted(list(keys_a - keys_b)),
        "only_in_b": sorted(list(keys_b - keys_a)),
        "intersection": len(keys_a & keys_b),
    }


def assert_invariants(result, expected):
    ok = True
    notes = []

    expected_types = expected.get("types", {})
    actual_types = result["env_a"]["summary"]["types"]
    if expected_types and actual_types != expected_types:
        ok = False
        notes.append(
            {
                "invariant": "types_match_expected",
                "expected": expected_types,
                "actual": actual_types,
            }
        )

    critical = expected.get("critical_resources", [])
    present = set(result["env_a"]["all_keys"]) | set(result["env_b"]["all_keys"])
    missing = [item for item in critical if item not in present]
    if missing:
        ok = False
        notes.append(
            {
                "invariant": "critical_resources_present",
                "missing": missing,
            }
        )

    required_secrets = expected.get("required_secrets", [])
    secrets_present = set(result.get("secrets_present", []))
    secrets_missing = [item for item in required_secrets if item not in secrets_present]
    if secrets_missing:
        ok = False
        notes.append(
            {
                "invariant": "required_secrets_present",
                "missing": secrets_missing,
            }
        )

    return ok, notes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cloud", required=True)
    parser.add_argument("--env-a", required=True)
    parser.add_argument("--env-b", required=True)
    parser.add_argument("--file-a", required=True)
    parser.add_argument("--file-b", required=True)
    parser.add_argument("--expected", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    manifest_a = load(args.file_a)
    manifest_b = load(args.file_b)
    expected = load(args.expected)

    all_keys_a = [resource_key(item) for item in manifest_a]
    all_keys_b = [resource_key(item) for item in manifest_b]

    result = {
        "cloud": args.cloud,
        "env_a": {
            "name": args.env_a,
            "summary": summarize(manifest_a),
            "all_keys": all_keys_a,
        },
        "env_b": {
            "name": args.env_b,
            "summary": summarize(manifest_b),
            "all_keys": all_keys_b,
        },
        "structural_diff": diff_structural(manifest_a, manifest_b),
        "assertions": {},
    }

    ok, notes = assert_invariants(result, expected)
    result["assertions"]["passed"] = ok
    result["assertions"]["notes"] = notes

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2, sort_keys=True)

    if not ok or result["structural_diff"]["only_in_a"] or result["structural_diff"]["only_in_b"]:
        print(json.dumps(result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
