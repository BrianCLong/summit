#!/usr/bin/env python3
"""Remove imported intel for a subject while preserving provenance records."""

import sys


def main(subject_id: str) -> None:
  # Placeholder for purge implementation
  print(f"Purging imported intel for {subject_id}")


if __name__ == "__main__":
  if len(sys.argv) != 2:
    print("usage: dsar_purge_imports.py <subject_id>")
    sys.exit(1)
  main(sys.argv[1])
