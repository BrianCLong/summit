import argparse
import glob
import hashlib
import json
import os


def hash_file(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            data = f.read(65536)
            if not data:
                break
            sha256.update(data)
    return sha256.hexdigest()

def expand_paths(paths_str):
    paths = []
    for p in paths_str.split(','):
        p = p.strip()
        if '*' in p:
            paths.extend(glob.glob(p))
        else:
            if os.path.exists(p):
                if os.path.isdir(p):
                    for root, _, files in os.walk(p):
                        for file in files:
                            paths.append(os.path.join(root, file))
                else:
                    paths.append(p)
    return sorted(list(set(paths)))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--step-name', required=True)
    parser.add_argument('--materials', required=True)
    parser.add_argument('--products', required=True)
    args = parser.parse_args()

    attestation = {
        "_type": "https://in-toto.io/Statement/v0.1",
        "subject": [],
        "predicateType": "https://slsa.dev/provenance/v0.2",
        "predicate": {
            "builder": {
                "id": "https://github.com/BrianCLong/summit"
            },
            "buildType": "https://github.com/BrianCLong/summit/build",
            "invocation": {
                "configSource": {},
                "parameters": {
                    "step_name": args.step_name
                }
            },
            "materials": []
        }
    }

    # Hash products -> subject
    for p in expand_paths(args.products):
        if os.path.isfile(p):
            h = hash_file(p)
            attestation["subject"].append({
                "name": p,
                "digest": {"sha256": h}
            })

    # Hash materials -> predicate.materials
    for m in expand_paths(args.materials):
        if os.path.isfile(m):
            h = hash_file(m)
            attestation["predicate"]["materials"].append({
                "uri": m,
                "digest": {"sha256": h}
            })

    with open('attestation.json', 'w') as f:
        json.dump(attestation, f, indent=2)

    print("Generated attestation.json")

if __name__ == "__main__":
    main()
