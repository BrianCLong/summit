# Relay Policy Enforcement Stub
import json
import sys


def validate_relay_config(config_path):
    with open(config_path) as f:
        config = json.load(f)

    if config.get('discovery_enabled', False):
        if not config.get('auth_enabled', False):
            print(f"FAILED: Discovery enabled without auth in {config_path}")
            return False

    if config.get('relay_enabled', False):
        if not config.get('audit_enabled', False):
             print(f"FAILED: Relay enabled without audit in {config_path}")
             return False

    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    if not validate_relay_config(sys.argv[1]):
        sys.exit(1)
    print("OK: Relay policy validated")
