package test.security_compliance

import future.keywords.if

authz := data.intelgraph.authz

# Analysts cannot access resources from another tenant (FedRAMP AC-6)
test_cross_tenant_access_denied if {
  not authz.allow with input as {
    "subject": {"tenant": "blue", "roles": ["analyst"]},
    "resource": {"tenant": "green", "type": "entity", "classification": "U"},
    "action": "read",
    "request": {"fields": {}}
  }
}

# TS data requires explicit clearance even when tenant matches (SOC2 CC6.1)
test_ts_requires_clearance if {
  not authz.allow with input as {
    "subject": {"tenant": "blue", "roles": ["analyst"], "clearance": {}},
    "resource": {"tenant": "blue", "type": "entity", "classification": "TS"},
    "action": "read",
    "request": {"fields": {}}
  }
}

# Admins can retrieve protected fields for incident response (GDPR Article 32 accountability)
test_admin_can_access_protected_field if {
  authz.allow with input as {
    "subject": {"tenant": "blue", "roles": ["admin"], "clearance": {"TS": true}},
    "resource": {"tenant": "blue", "type": "entity", "classification": "TS"},
    "action": "read",
    "request": {"fields": {"Entity.sensitiveNotes": true}}
  }
}

# Non-admins remain blocked from sensitive fields even when cleared for TS
# (SOC2 CC7.1, defense in depth)
test_sensitive_fields_denied_for_non_admin if {
  not authz.allow with input as {
    "subject": {"tenant": "blue", "roles": ["analyst"], "clearance": {"TS": true}},
    "resource": {"tenant": "blue", "type": "entity", "classification": "TS"},
    "action": "read",
    "request": {"fields": {"Entity.sensitiveNotes": true}}
  }
}
