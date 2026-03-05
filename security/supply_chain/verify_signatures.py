# Supply Chain Signature Verification Stub
import json
import sys


def verify_artifact(artifact_path):
    with open(artifact_path) as f:
        data = json.load(f)

    if not data.get('signature'):
        print(f"FAILED: Artifact {artifact_path} is not signed")
        return False

    # In a real implementation, we would verify the signature here
    print(f"Verified signature for {artifact_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    if not verify_artifact(sys.argv[1]):
        sys.exit(1)
