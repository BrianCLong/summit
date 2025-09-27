import json
import sys
import datetime

def purge(subject_id: str):
  receipt = {"subject": subject_id, "purged": True, "timestamp": datetime.datetime.utcnow().isoformat()}
  print(json.dumps(receipt))
  return receipt

if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("usage: dsar_purge_psi.py <subject_id>")
    sys.exit(1)
  purge(sys.argv[1])
