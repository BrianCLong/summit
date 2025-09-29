#!/usr/bin/env python3
import json, sys, os, hashlib

LEDGER = 'prov-ledger/log.json'

def purge(subject):
    if not os.path.exists(LEDGER):
        return []
    data = json.load(open(LEDGER))
    remaining = [e for e in data if e.get('meta', {}).get('subject') != subject]
    removed = [e for e in data if e not in remaining]
    json.dump(remaining, open(LEDGER, 'w'))
    receipt = {
        'subject': subject,
        'removed': len(removed),
    }
    digest = hashlib.sha256(json.dumps(receipt).encode()).hexdigest()
    receipt['digest'] = digest
    print(json.dumps(receipt))

if __name__ == '__main__':
    purge(sys.argv[1] if len(sys.argv) > 1 else '')
