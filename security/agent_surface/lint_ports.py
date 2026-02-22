# Agent Surface Port Lint
# Fails if any publicly exposed admin/control endpoints are declared without auth

import json
import sys

FORBIDDEN_PORTS = {18789, 18791, 22}

def lint_config(config_path):
    with open(config_path, 'r') as f:
        config = json.load(f)

    exposed_ports = config.get('exposed_ports', [])
    for p in exposed_ports:
        port = p.get('port')
        if port in FORBIDDEN_PORTS:
            if not p.get('auth_enabled', False):
                 print(f"FAILED: Port {port} is exposed without auth in {config_path}")
                 return False
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    if not lint_config(sys.argv[1]):
        sys.exit(1)
    print("OK: Port surface validated")
