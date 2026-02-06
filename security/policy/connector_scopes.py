# Connector Scopes Policy Enforcement Stub
# Validates that connectors used by agents stay within declared scopes

import json
import os


def validate_scopes(agent_id, connector_id, requested_scopes):
    manifest_path = "connectors/manifest.json"
    if not os.path.exists(manifest_path):
        return True

    with open(manifest_path) as f:
        manifest = json.load(f)

    connector = next((c for c in manifest.get('connectors', []) if c['id'] == connector_id), None)
    if not connector:
        print(f"Unknown connector: {connector_id}")
        return False

    allowed_scopes = set(connector.get('scopes', []))
    for scope in requested_scopes:
        if scope not in allowed_scopes:
            print(f"Scope {scope} not allowed for connector {connector_id}")
            return False

    return True
