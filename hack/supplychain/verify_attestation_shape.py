#!/usr/bin/env python3
"""Verify the shape/schema of a supply-chain attestation JSON file.

Returns 0 on valid attestation, 1 on invalid or error.
"""
import json
import sys


KNOWN_SHAPES = [
    # SPDX SBOM
    lambda d: "spdxVersion" in d,
    # SLSA provenance
    lambda d: "builder" in d and "buildType" in d,
    # In-toto statement
    lambda d: "predicateType" in d and "subject" in d,
    # CycloneDX SBOM
    lambda d: "bomFormat" in d and d.get("bomFormat") == "CycloneDX",
]


def verify_shape(filepath):
    """Verify attestation file matches a known shape. Returns 0 or 1."""
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR: Failed to parse {filepath}: {e}", file=sys.stderr)
        return 1

    for check in KNOWN_SHAPES:
        try:
            if check(data):
                return 0
        except (KeyError, TypeError):
            continue

    print(f"WARNING: {filepath} does not match any known attestation shape", file=sys.stderr)
    return 1


def main():
    if len(sys.argv) < 2:
        print("Usage: verify_attestation_shape.py <file.json>", file=sys.stderr)
        sys.exit(1)

    rc = verify_shape(sys.argv[1])
    sys.exit(rc)


if __name__ == "__main__":
    main()
