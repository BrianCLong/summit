# Trust Boundary Lint
# Fails if config implies "localhost is trusted" while behind a reverse proxy

import json
import sys


def lint_trust(config_path):
    with open(config_path) as f:
        config = json.load(f)

    if config.get('reverse_proxy_enabled', False):
        if config.get('trust_localhost', False):
            print(f"FAILED: Localhost trust enabled behind reverse proxy in {config_path}")
            return False
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    if not lint_trust(sys.argv[1]):
        sys.exit(1)
    print("OK: Trust boundary validated")
