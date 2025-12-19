package summit.abac.test

import data.summit.abac

base_subject := {
  "id": "alice",
  "tenantId": "tenantA",
  "roles": ["reader"],
  "entitlements": ["dataset-alpha:read"],
  "residency": "us",
  "clearance": "secret",
  "loa": "loa1",
  "riskScore": 10,
  "groups": ["dataset-alpha"],
  "metadata": {"email": "alice@example.com"}
}

base_resource := {
  "id": "dataset-alpha",
  "tenantId": "tenantA",
  "residency": "us",
  "classification": "confidential",
  "tags": ["pii"]
}

base_context := {
  "protectedActions": ["dataset:write", "dataset:delete", "dataset:share-external", "policy:publish", "dataset:purge", "audit-log:read"],
  "requestTime": "2025-01-07T12:00:00Z",
  "currentAcr": "loa1"
}

decision_for(subject, resource, action) = decision {
  decision := abac.decision with input as {
    "subject": subject,
    "resource": resource,
    "action": action,
    "context": base_context
  }
}

base_decision(action) = decision_for(base_subject, base_resource, action)

allow(decision) {
  decision.allow
}

test_allow_same_tenant {
  decision := base_decision("dataset:read")
  allow(decision)
  decision.reason == "allow"
  decision.obligations[0].type == "step_up"
}

test_deny_cross_tenant {
  resource := object.union(base_resource, {"tenantId": "tenantB"})
  decision := decision_for(base_subject, resource, "dataset:read")
  not decision.allow
  decision.reason == "tenant_mismatch"
}

test_deny_residency_mismatch {
  resource := object.union(base_resource, {"residency": "eu"})
  decision := decision_for(base_subject, resource, "dataset:read")
  not decision.allow
  decision.reason == "residency_mismatch"
}

test_deny_clearance {
  subject := object.union(base_subject, {"clearance": "restricted"})
  decision := decision_for(subject, base_resource, "dataset:read")
  not decision.allow
  decision.reason == "insufficient_clearance"
}

test_least_privilege_violation {
  decision := base_decision("dataset:delete")
  not decision.allow
  decision.reason == "least_privilege_violation"
}

test_requires_step_up_for_secret {
  resource := object.union(base_resource, {"classification": "secret"})
  decision := decision_for(base_subject, resource, "dataset:read")
  allow(decision)
  decision.obligations[0].type == "step_up"
}

test_step_up_satisfied_with_high_acr {
  resource := object.union(base_resource, {"classification": "confidential"})
  context := object.union(base_context, {"currentAcr": "loa2"})
  decision := abac.decision with input as {
    "subject": base_subject,
    "resource": resource,
    "action": "dataset:read",
    "context": context
  }
  allow(decision)
  count(decision.obligations) == 0
}

test_audit_log_access_requires_step_up {
  subject := object.union(base_subject, {
    "roles": ["auditor"],
    "entitlements": []
  })
  resource := {
    "id": "audit-log",
    "tenantId": "tenantA",
    "residency": "us",
    "classification": "secret",
    "tags": ["operational"]
  }
  decision := abac.decision with input as {
    "subject": subject,
    "resource": resource,
    "action": "audit-log:read",
    "context": base_context
  }
  allow(decision)
  some obligation
  decision.obligations[obligation].type == "step_up"
}

test_dual_control_required_for_privileged_action {
  subject := object.union(base_subject, {
    "roles": ["admin"],
    "entitlements": ["dataset-alpha:read", "dataset-alpha:purge"]
  })
  resource := object.union(base_resource, {"classification": "secret"})
  decision := decision_for(subject, resource, "dataset:purge")
  not decision.allow
  decision.reason == "dual_control_required"
  some ob
  decision.obligations[ob].type == "dual_control"
  some step_up
  decision.obligations[step_up].type == "step_up"
}

test_dual_control_succeeds_with_two_approvals_and_roles {
  subject := {
    "id": "sam",
    "tenantId": "tenantA",
    "roles": ["admin", "steward"],
    "entitlements": ["dataset-critical:purge"],
    "residency": "us",
    "clearance": "secret",
    "loa": "loa2",
    "riskScore": 2,
    "groups": ["dataset-critical"],
    "metadata": {"email": "sam@example.com"}
  }
  resource := {
    "id": "dataset-critical",
    "tenantId": "tenantA",
    "residency": "us",
    "classification": "secret",
    "tags": ["pii", "mission-critical"]
  }
  context := object.union(base_context, {
    "currentAcr": "loa2",
    "approvals": [
      {"actorId": "secops-1", "role": "security-admin"},
      {"actorId": "compliance-1", "role": "compliance-officer"}
    ]
  })
  decision := abac.decision with input as {
    "subject": subject,
    "resource": resource,
    "action": "dataset:purge",
    "context": context
  }
  allow(decision)
  decision.reason == "allow"
  count(decision.obligations) == 0
}
