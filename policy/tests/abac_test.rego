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

base_resource := {
  "id": "dataset-alpha",
  "tenantId": "tenantA",
  "residency": "us",
  "classification": "confidential",
  "tags": ["pii"]
}

base_context := {
  "protectedActions": ["dataset:write", "dataset:delete", "dataset:share-external", "policy:publish"],
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
  resource := base_resource { "tenantId": "tenantB" }
  decision := decision_for(base_subject, resource, "dataset:read")
  not decision.allow
  decision.reason == "tenant_mismatch"
}

test_deny_residency_mismatch {
  resource := base_resource { "residency": "eu" }
  decision := decision_for(base_subject, resource, "dataset:read")
  not decision.allow
  decision.reason == "residency_mismatch"
}

test_deny_clearance {
  subject := base_subject { "clearance": "restricted" }
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
  resource := base_resource { "classification": "secret" }
  decision := decision_for(base_subject, resource, "dataset:read")
  allow(decision)
  decision.obligations[0].type == "step_up"
}

test_step_up_satisfied_with_high_acr {
  resource := base_resource { "classification": "confidential" }
  context := base_context { "currentAcr": "loa2" }
  decision := abac.decision with input as {
    "subject": base_subject,
    "resource": resource,
    "action": "dataset:read",
    "context": context
  }
  allow(decision)
  count(decision.obligations) == 0
}
