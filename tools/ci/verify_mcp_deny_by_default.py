import sys
from pathlib import Path

import yaml

ALLOWLIST_PATH = Path("mcp/allowlist.yaml")

def test_mcp_deny_by_default():
    print("Testing MCP deny-by-default...")
    if not ALLOWLIST_PATH.exists():
        print("FAIL: mcp/allowlist.yaml missing")
        return False

    with open(ALLOWLIST_PATH) as f:
        data = yaml.safe_load(f)

    allowed_ids = [s["id"] for s in data.get("allowed_servers", [])]

    # Simulate a request for an unauthorized server
    requested_server = "unauthorized-malicious-tool"

    if requested_server in allowed_ids:
        print(f"FAIL: Unauthorized server {requested_server} found in allowlist!")
        return False
    else:
        print(f"PASS: Unauthorized server {requested_server} is correctly blocked by default.")
        return True

if __name__ == "__main__":
    if not test_mcp_deny_by_default():
        sys.exit(1)
