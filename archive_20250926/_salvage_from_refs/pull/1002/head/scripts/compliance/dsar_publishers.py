#!/usr/bin/env python3
import hashlib, json, os, sys, time

def purge(publisher_id: str):
  paths = [f"bundles/{publisher_id}", f"cache/{publisher_id}"]
  deleted = []
  for p in paths:
    if os.path.exists(p):
      deleted.append(p)
  digest = hashlib.sha256(''.join(deleted).encode()).hexdigest()
  receipt = {"publisher": publisher_id, "deleted": deleted, "ts": time.time(), "digest": digest}
  print(json.dumps(receipt))
  return receipt

if __name__ == '__main__':
  if len(sys.argv) < 2:
    print('usage: dsar_publishers.py <publisher_id>')
    sys.exit(1)
  purge(sys.argv[1])
