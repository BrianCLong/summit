# server/src/governance/access_manager.py

import os


def _evaluate_opa_policy(policy_path: str, input_data: dict) -> bool:
    """
    Simulates OPA policy evaluation.
    In a real system, this would call an OPA agent or service.
    For simplicity, we'll hardcode some logic based on the dummy policy.
    """
    print(f"Simulating OPA evaluation for policy {policy_path} with input {input_data}")

    # This is a very simplified simulation of the access_control.rego policy
    method = input_data.get("method")
    path = input_data.get("path", [])
    user_roles = input_data.get("user", {}).get("roles", [])

    # Extract resource and action from path for the new rule
    resource = path[0] if len(path) > 0 else None
    action = path[1] if len(path) > 1 else None

    if method == "GET" and path == ["data", "read"] and "reader" in user_roles:
        return True
    if method == "POST" and path == ["data", "write"] and "writer" in user_roles:
        return True

    # Rule for cypher_sandbox execution
    if resource == "cypher_sandbox" and action == "execute_query" and "admin" in user_roles:
        return True

    return False


def check_access(user_context: dict, resource: str, action: str) -> bool:
    """
    Stub for ABAC/RBAC access control check via OPA.
    """
    print(f"Checking access for user {user_context.get('id')} on {resource} with action {action}")

    # Construct input for OPA simulation
    input_data = {
        "method": "GET" if action == "read" else "POST",  # Simplified mapping
        "path": [resource, action],  # Simplified mapping
        "user": user_context,
    }

    # Path to the dummy OPA policy file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "../../.."))
    opa_policy_path = os.path.join(project_root, "policy/opa/access_control.rego")

    return _evaluate_opa_policy(opa_policy_path, input_data)


def check_warrant_and_authority(query_context: dict) -> dict:
    """
    Stub for checking warrant and authority binding on queries.
    """
    print(f"Checking warrant and authority for query: {query_context}")
    # Simulate check
    if query_context.get("warrant_id") and query_context.get("authority_level", 0) >= 3:
        return {"authorized": True, "reason": "Valid warrant and sufficient authority."}
    return {"authorized": False, "reason": "Missing or insufficient warrant/authority."}


def enforce_license_and_tos(export_context: dict) -> dict:
    """
    Stub for enforcing license and TOS checks at query/export time.
    """
    print(f"Enforcing license and TOS for export: {export_context}")
    # Simulate check
    if export_context.get("license_agreed") and export_context.get("tos_version", 0) >= 1.0:
        return {"allowed": True, "reason": "License and TOS accepted."}
    return {"allowed": False, "reason": "License or TOS not accepted.", "appeal_path": "/appeal"}
