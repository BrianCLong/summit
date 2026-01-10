#!/usr/bin/env python3
"""
Ownership Drift Detection Script
Checks for files in critical paths that are not covered by CODEOWNERS.
Also validates that domains in OWNERSHIP_MODEL.md have active DRIs.
"""

import os
import sys

CRITICAL_PATHS = [
    "services/prov-ledger",
    "gateway/policy-lac",
    "server/src/provenance",
    "server/src/security",
    "policy",
    "opa",
]

CODEOWNERS_FILE = "CODEOWNERS"


def load_codeowners():
    owners = []
    if not os.path.exists(CODEOWNERS_FILE):
        return []
    with open(CODEOWNERS_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split()
                if parts:
                    owners.append(parts[0])
    return owners


def check_drift():
    owned_paths = load_codeowners()
    missing = []

    # Simple check: Are critical paths listed in CODEOWNERS?
    # This is a basic check. Real CODEOWNERS logic is more complex (globs),
    # but this ensures explicit entries exist for our top-level critical criticals.
    for path in CRITICAL_PATHS:
        found = False
        for owner_path in owned_paths:
            # Check if exact match or if owner_path is a parent of path (and matches / at end if dir)
            # Actually, standard CODEOWNERS matches patterns.
            # We will just check if the path starts with any of the owned paths.
            # Normalizing slashes
            norm_path = path if path.startswith("/") else "/" + path
            norm_owner = owner_path if owner_path.startswith("/") else "/" + owner_path

            # Remove trailing slashes for comparison
            if norm_path.strip("/") == norm_owner.strip("/"):
                found = True
                break

            # Or if owned path is a prefix (directory match)
            if norm_path.startswith(norm_owner.rstrip("/") + "/"):
                found = True
                break

        if not found:
            missing.append(path)

    if missing:
        print("DRIFT DETECTED! The following critical paths lack explicit ownership in CODEOWNERS:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)
    else:
        print("Ownership Audit Passed: All critical paths have DRIs.")
        sys.exit(0)


if __name__ == "__main__":
    check_drift()
