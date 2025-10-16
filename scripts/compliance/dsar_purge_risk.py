#!/usr/bin/env python3
"""Remove risk artifacts for a subject."""

import sys


def purge(subject_id: str):
    # Placeholder: remove risk data from stores
    print(f"purged risk data for {subject_id}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: dsar_purge_risk.py <subject_id>")
        sys.exit(1)
    purge(sys.argv[1])
