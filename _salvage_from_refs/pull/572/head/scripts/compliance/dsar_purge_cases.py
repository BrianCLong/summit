#!/usr/bin/env python3
import sys, os

if len(sys.argv) < 2:
    print('usage: dsar_purge_cases.py <subject>')
    sys.exit(1)

subject = sys.argv[1]
print(f'Purging exports for {subject} (placeholder)')
