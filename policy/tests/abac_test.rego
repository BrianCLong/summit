import future.keywords
package summit.abac.test

import data.summit.abac

base_subject := {
  "id": "alice",
  "tenantId": "tenantA",
  "roles": ["reader"],
  "entitlements": ["dataset-alpha:read"],
  "residency": "us",
  "clearance": "confidential",
  "loa": "loa1",
  "riskScore": 10,
  "groups": ["dataset-alpha"],
  "metadata": {"email": "alice@example.com"}
}

merge(base, overrides) := object.union(base, overrides)

base_resource := {
  "id": "dataset-alpha",
  "tenantId": "tenantA",
  "residency": "us",
  "classification": "confidential",
  "tags": ["pii"]
}

base_context := {
  "protectedActions": ["dataset:write", "dataset:delete", "dataset:share-external", "dataset:purge", "dataset:reclassify", "dataset:break-glass", "policy:publish"],
  "requestTime": "2025-01-07T12:00:00Z",
  "currentAcr": "loa1"
}

decision_for(subject, resource, action) := decision if {
  decision := abac.decision with input as {
    "subject": subject,
    "resource": resource,
    "action": action,
    "context": base_context
  }
}

base_decision(action) := decision_for(base_subject, base_resource, action)

allow(decision) if {
  decision.allow
}

test_allow_same_tenant if {
  decision := base_decision("dataset:read")
  allow(decision)
  decision.reason == "allow"
  decision.obligations[0].type == "step_up"
}

test_deny_cross_tenant if {
  resource := merge(base_resource, {"tenantId": "tenantB"})
  decision := decision_for(base_subject, resource, "dataset:read")
  not decision.allow
  decision.reason == "tenant_mismatch"
}

test_deny_residency_mismatch if {
  resource := merge(base_resource, {"residency": "eu"})
  decision := decision_for(base_subject, resource, "dataset:read")
  not decision.allow
  decision.reason == "residency_mismatch"
}

test_deny_clearance if {
  subject := merge(base_subject, {"clearance": "restricted"})
  decision := decision_for(subject, base_resource, "dataset:read")
  not decision.allow
  decision.reason == "insufficient_clearance"
}

test_least_privilege_violation if {
  decision := base_decision("dataset:delete")
  not decision.allow
  decision.reason == "least_privilege_violation"
}

test_requires_step_up_for_secret if {
  resource := merge(base_resource, {"classification": "secret"})
  subject := merge(base_subject, {"clearance": "secret"})
  decision := decision_for(subject, resource, "dataset:read")
  allow(decision)
  decision.obligations[0].type == "step_up"
}

test_step_up_satisfied_with_high_acr if {
  resource := merge(base_resource, {"classification": "confidential"})
  context := merge(base_context, {"currentAcr": "loa2"})
  decision := abac.decision with input as {
    "subject": base_subject,
    "resource": resource,
    "action": "dataset:read",
    "context": context
  }
  allow(decision)
  count(decision.obligations) == 0
}

test_dual_control_blocks_privileged_action_without_approvals if {
  subject := merge(base_subject, {
    "id": "sam",
    "roles": ["incident-responder"],
    "clearance": "top-secret"
  })

  resource := merge(base_resource, {
    "id": "dataset-omega",
    "classification": "top-secret"
  })

  context := merge(base_context, {
    "currentAcr": "loa1",
    "dualControlApprovals": []
  })

  decision := abac.decision with input as {
    "subject": subject,
    "resource": resource,
    "action": "dataset:purge",
    "context": context
  }

  not decision.allow
  decision.reason == "dual_control_required"
  some i
  decision.obligations[i].type == "dual_control"
}

test_dual_control_rejects_self_approval_and_requires_two_distinct if {
  subject := merge(base_subject, {
    "id": "sam",
    "roles": ["incident-responder"],
    "clearance": "top-secret"
  })

  resource := merge(base_resource, {
    "id": "dataset-omega",
    "classification": "top-secret"
  })

  context := merge(base_context, {
    "currentAcr": "loa2",
    "dualControlApprovals": ["sam", "approver-one"]
  })

  decision := abac.decision with input as {
    "subject": subject,
    "resource": resource,
    "action": "dataset:purge",
    "context": context
  }

  not decision.allow
  decision.reason == "dual_control_required"
  some i
  decision.obligations[i].type == "dual_control"
}

test_dual_control_allows_privileged_action_with_two_distinct_approvals if {
  subject := merge(base_subject, {
    "id": "sam",
    "roles": ["incident-responder"],
    "clearance": "top-secret"
  })

  resource := merge(base_resource, {
    "id": "dataset-omega",
    "classification": "top-secret"
  })

  context := merge(base_context, {
    "currentAcr": "loa2",
    "dualControlApprovals": ["approver-one", "approver-two"]
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
