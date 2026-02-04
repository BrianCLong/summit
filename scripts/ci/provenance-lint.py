import json, glob, sys
import os

def check_provenance():
    bad = []
    manifests = glob.glob("data/manifests/science/*.manifest.json")
    for p in manifests:
        try:
            with open(p) as f:
                o = json.load(f)
            prov = o.get("provenance", {})
            if "license" not in prov or "version_pin" not in o:
                bad.append(p)
        except Exception as e:
            print(f"Error reading {p}: {e}")
            bad.append(p)

    if bad:
        print("Missing license/version_pin or invalid JSON:", bad)
        sys.exit(1)
    else:
        print("Provenance check passed.")

if __name__ == "__main__":
    check_provenance()
