#!/usr/bin/env python3
import sys


def purge(subject: str):
  print(f"Purging hunts for {subject}")
  # Placeholder for deletion logic


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("usage: dsar_purge_hunts.py <subject>")
    sys.exit(1)
  purge(sys.argv[1])
