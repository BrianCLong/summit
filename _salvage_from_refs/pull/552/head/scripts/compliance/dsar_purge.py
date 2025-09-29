#!/usr/bin/env python3
"""Locate and purge derived features for a subject ID."""
import argparse
import json
from datetime import datetime

LEDGER = []

def purge(subject_id: str, dry_run: bool):
    # placeholder for search and removal logic
    found = [f"embedding:{subject_id}", f"phash:{subject_id}"]
    if dry_run:
        print("Would purge", found)
        return
    # simulate deletion
    print("Purged", found)
    LEDGER.append({
        "subject": subject_id,
        "at": datetime.utcnow().isoformat(),
        "items": found,
    })
    with open('dsar-purge.log', 'a') as fh:
        fh.write(json.dumps(LEDGER[-1]) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='DSAR derived feature purge')
    parser.add_argument('subject_id')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    purge(args.subject_id, args.dry_run)
