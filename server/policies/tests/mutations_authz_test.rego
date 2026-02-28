package intelgraph.mutations

import future.keywords.if
import future.keywords.in

# allowed_roles is defined in mutations_authz.rego (same package), accessed directly

test_allow_listed_roles if {
  some id
  entry := allowed_roles[id]
  some role in entry.roles
  decision := data.intelgraph.mutations.decision with input as {
    "action": entry.action,
    "resource": {"type": "mutation", "id": id, "tenantId": "tenant-1"},
    "actor": {"roles": [role], "tenantId": "tenant-1"}
  }
  decision.allow
}

test_deny_wrong_role if {
  some id
  entry := allowed_roles[id]
  decision := data.intelgraph.mutations.decision with input as {
    "action": entry.action,
    "resource": {"type": "mutation", "id": id, "tenantId": "tenant-1"},
    "actor": {"roles": ["viewer"], "tenantId": "tenant-1"}
  }
  not decision.allow
}

test_deny_action_mismatch if {
  some id
  decision := data.intelgraph.mutations.decision with input as {
    "action": "read",
    "resource": {"type": "mutation", "id": id, "tenantId": "tenant-1"},
    "actor": {"roles": [allowed_roles[id].roles[0]], "tenantId": "tenant-1"}
  }
  not decision.allow
}

test_deny_tenant_mismatch if {
  some id
  entry := allowed_roles[id]
  decision := data.intelgraph.mutations.decision with input as {
    "action": entry.action,
    "resource": {"type": "mutation", "id": id, "tenantId": "tenant-1"},
    "actor": {"roles": [entry.roles[0]], "tenantId": "tenant-2"}
  }
  not decision.allow
}
