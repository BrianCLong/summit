import json
import sys
from pathlib import Path

def evaluate_signal(signal_data):
    """
    Evaluates a signal against the Market Intel policy.
    Returns (True, "OK") if valid, (False, reason) otherwise.
    """
    # Rule 1: Numeric claims must have citations
    claims = signal_data.get("claims", [])
    for claim in claims:
        if claim.get("type") == "numeric":
            if not claim.get("citations"):
                return False, "Missing mandatory citations for numeric claim"

    # Rule 2: No restricted body for restricted sources
    for source in signal_data.get("sources", []):
        publisher = source.get("publisher", "")
        license_class = source.get("license_class", "")
        is_restricted = source.get("restricted_body") is True or "WSJ" in publisher or license_class == "restricted"

        if is_restricted:
            if source.get("body"):
                return False, f"Restricted body storage detected for source: {publisher}"
            if source.get("restricted_body") is not True:
                return False, f"Restricted source {publisher} missing 'restricted_body: true' flag"

    return True, "OK"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 evaluate_policy.py <signal_json_path>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    try:
        data = load_json(path)
        success, reason = evaluate_signal(data)
        if not success:
            print(f"Policy Violation: {reason}")
            sys.exit(1)
        print("Policy check passed.")
    except Exception as e:
        print(f"Error evaluating signal: {e}")
        sys.exit(1)

def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

if __name__ == "__main__":
    main()
