package summit.authz_test

import data.summit.authz

base_subject := {
  "id": "user-1",
  "tenant": "tenant-a",
  "roles": ["manager"],
  "attributes": {
    "clearance": "restricted",
    "mfa_enrolled": true,
    "purpose_tags": ["intel-analysis", "legal-review"]
  }
}

base_resource := {
  "id": "report-1",
  "tenant": "tenant-a",
  "classification": "confidential",
  "purpose_tags": ["intel-analysis"],
  "pii": true,
  "retention_days": 14,
  "legal_hold": false,
  "fields": [
    {
      "name": "ssn",
      "sensitive": true,
      "tags": ["pii"],
      "encrypted": true,
      "algorithm": "aes-256-gcm",
      "kms_key_id": "kms/tenant-a/pii"
    },
    {
      "name": "summary",
      "sensitive": false,
      "tags": []
    }
  ]
}

base_environment := {
  "require_mfa": true,
  "mfa_satisfied": true,
  "audit": {
    "event_id": "evt-123",
    "immutable": true
  }
}

allow_input := {
  "subject": base_subject,
  "resource": base_resource,
  "action": "read",
  "environment": base_environment
}

legal_hold_resource := object.union(base_resource, {"legal_hold": true})

legal_hold_subject := {
  "id": "counsel-1",
  "tenant": "tenant-a",
  "roles": ["legal"],
  "attributes": {
    "clearance": "secret",
    "mfa_enrolled": true,
    "purpose_tags": ["legal-review"]
  }
}

cross_tenant_resource := object.union(base_resource, {"tenant": "tenant-b"})

unencrypted_resource := object.union(base_resource, {
  "fields": [
    {
      "name": "ssn",
      "sensitive": true,
      "tags": ["pii"],
      "encrypted": false,
      "algorithm": "",
      "kms_key_id": ""
    }
  ]
})

retention_drift_resource := object.union(base_resource, {"retention_days": 60})

mismatched_purpose_resource := object.union(base_resource, {"purpose_tags": ["fraud-monitoring"]})

test_manager_can_read_confidential_report {
  data.summit.authz.allow with input as allow_input
}

test_cross_tenant_access_denied {
  not data.summit.authz.allow with input as {
    "subject": base_subject,
    "resource": cross_tenant_resource,
    "action": "read",
    "environment": base_environment
  }
}

test_missing_encryption_denied {
  not data.summit.authz.allow with input as {
    "subject": base_subject,
    "resource": unencrypted_resource,
    "action": "read",
    "environment": base_environment
  }
}

test_retention_policy_enforced {
  not data.summit.authz.allow with input as {
    "subject": base_subject,
    "resource": retention_drift_resource,
    "action": "read",
    "environment": base_environment
  }
}

test_purpose_mismatch_denied {
  not data.summit.authz.allow with input as {
    "subject": base_subject,
    "resource": mismatched_purpose_resource,
    "action": "read",
    "environment": base_environment
  }
}

test_legal_hold_requires_legal_role {
  not data.summit.authz.allow with input as {
    "subject": base_subject,
    "resource": legal_hold_resource,
    "action": "read",
    "environment": base_environment
  }
}

test_legal_hold_allows_legal_role {
  data.summit.authz.allow with input as {
    "subject": legal_hold_subject,
    "resource": legal_hold_resource,
    "action": "read",
    "environment": base_environment
  }
}
