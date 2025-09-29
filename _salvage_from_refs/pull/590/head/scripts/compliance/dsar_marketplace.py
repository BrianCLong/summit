import json
import sys


def purge_artifacts(entitlement_id: str):
  print(f"Purging artifacts for {entitlement_id}")
  receipt = {"entitlementId": entitlement_id, "status": "purged"}
  print(json.dumps(receipt))


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("usage: dsar_marketplace.py <entitlementId>")
    sys.exit(1)
  purge_artifacts(sys.argv[1])
