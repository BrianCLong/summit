# Zero-Trust Core Policy Tests
package intelgraph.zerotrust.core_test

import rego.v1
import data.intelgraph.zerotrust.core

# ============================================================================
# TEST DATA
# ============================================================================

test_valid_spiffe_input := {
  "identity": {
    "spiffe_id": "spiffe://intelgraph.local/ns/production/sa/api-service",
    "mfa_verified": true,
    "status": "active",
    "roles": ["analyst"],
    "clearance_level": 3,
    "tenant_id": "tenant-001",
    "permissions": []
  },
  "session": {
    "id": "session-123",
    "last_verified_ns": time.now_ns() - 60000000000
  },
  "device": {
    "registered": true,
    "compliance_score": 0.9,
    "last_attestation_ns": time.now_ns() - 1800000000000
  },
  "action": "read",
  "resource": {
    "id": "resource-001",
    "type": "data",
    "classification": "confidential",
    "required_clearance": 2,
    "tenant_id": "tenant-001"
  },
  "context": {
    "source_ip": "10.0.0.1",
    "network_type": "airgapped",
    "location": "datacenter-1",
    "previous_location": "",
    "time_since_last_access_seconds": 0,
    "risk_indicators": []
  },
  "behavior": {
    "anomaly_score": 0.8
  }
}

test_expired_session_input := {
  "identity": {
    "spiffe_id": "spiffe://intelgraph.local/ns/production/sa/api-service",
    "mfa_verified": true,
    "status": "active"
  },
  "session": {
    "id": "session-456",
    "last_verified_ns": time.now_ns() - 1800000000000
  },
  "device": {
    "registered": true,
    "compliance_score": 0.9,
    "last_attestation_ns": time.now_ns() - 1800000000000
  },
  "action": "write",
  "resource": {
    "id": "resource-002",
    "type": "data"
  },
  "context": {
    "source_ip": "10.0.0.2",
    "network_type": "airgapped",
    "risk_indicators": []
  }
}

# ============================================================================
# IDENTITY VERIFICATION TESTS
# ============================================================================

test_valid_spiffe_uri_intelgraph_local if {
  core.valid_spiffe_uri("spiffe://intelgraph.local/ns/prod/sa/service") with data.revoked_identities as []
}

test_valid_spiffe_uri_intelgraph_airgap if {
  core.valid_spiffe_uri("spiffe://intelgraph.airgap/ns/prod/sa/service") with data.revoked_identities as []
}

test_invalid_spiffe_uri_external if {
  not core.valid_spiffe_uri("spiffe://external.com/ns/prod/sa/service")
}

test_identity_verified_with_valid_spiffe if {
  core.identity_verified with input as test_valid_spiffe_input
    with data.revoked_identities as []
}

test_identity_not_verified_when_revoked if {
  not core.identity_verified with input as test_valid_spiffe_input
    with data.revoked_identities as ["spiffe://intelgraph.local/ns/production/sa/api-service"]
}

# ============================================================================
# SESSION FRESHNESS TESTS
# ============================================================================

test_session_fresh_within_5_minutes if {
  input_data := {
    "session": {
      "last_verified_ns": time.now_ns() - 240000000000
    }
  }
  core.session_fresh with input as input_data
}

test_session_not_fresh_after_5_minutes if {
  input_data := {
    "session": {
      "last_verified_ns": time.now_ns() - 360000000000
    }
  }
  not core.session_fresh with input as input_data
}

test_session_valid_within_15_minutes if {
  input_data := {
    "session": {
      "last_verified_ns": time.now_ns() - 840000000000
    }
  }
  core.session_valid with input as input_data
}

# ============================================================================
# DEVICE TRUST TESTS
# ============================================================================

test_device_trusted_with_good_compliance if {
  input_data := {
    "device": {
      "registered": true,
      "compliance_score": 0.85,
      "last_attestation_ns": time.now_ns() - 1800000000000
    }
  }
  core.device_trusted with input as input_data
}

test_device_not_trusted_low_compliance if {
  input_data := {
    "device": {
      "registered": true,
      "compliance_score": 0.5,
      "last_attestation_ns": time.now_ns() - 1800000000000
    }
  }
  not core.device_trusted with input as input_data
}

test_device_not_trusted_unregistered if {
  input_data := {
    "device": {
      "registered": false,
      "compliance_score": 0.9,
      "last_attestation_ns": time.now_ns() - 1800000000000
    }
  }
  not core.device_trusted with input as input_data
}

test_device_acceptable_for_read_with_moderate_compliance if {
  input_data := {
    "action": "read",
    "device": {
      "registered": false,
      "compliance_score": 0.6,
      "last_attestation_ns": time.now_ns() - 1800000000000
    }
  }
  core.device_acceptable with input as input_data
}

# ============================================================================
# TRUST SCORE TESTS
# ============================================================================

test_trust_score_high_for_verified_mfa_user if {
  score := core.trust_score with input as test_valid_spiffe_input
    with data.revoked_identities as []
    with data.allowed_locations as ["datacenter-1"]
    with data.business_hours as {"start": 0, "end": 24}
  score >= 0.7
}

test_minimum_trust_for_read_action if {
  threshold := core.minimum_trust_for_action with input as {"action": "read"}
  threshold == 0.5
}

test_minimum_trust_for_delete_action if {
  threshold := core.minimum_trust_for_action with input as {"action": "delete"}
  threshold == 0.9
}

test_minimum_trust_for_write_action if {
  threshold := core.minimum_trust_for_action with input as {"action": "write"}
  threshold == 0.7
}

# ============================================================================
# CONTEXT ANALYSIS TESTS
# ============================================================================

test_location_expected_airgap_internal if {
  input_data := {
    "context": {
      "network_type": "airgapped",
      "source_ip": "10.0.0.1"
    }
  }
  core.location_expected with input as input_data with data.allowed_locations as []
}

test_location_expected_airgap_172_range if {
  input_data := {
    "context": {
      "network_type": "airgapped",
      "source_ip": "172.16.0.1"
    }
  }
  core.location_expected with input as input_data with data.allowed_locations as []
}

test_location_expected_airgap_192_range if {
  input_data := {
    "context": {
      "network_type": "airgapped",
      "source_ip": "192.168.1.1"
    }
  }
  core.location_expected with input as input_data with data.allowed_locations as []
}

# ============================================================================
# EXPLICIT DENIAL TESTS
# ============================================================================

test_explicitly_denied_suspended_identity if {
  input_data := {
    "identity": {
      "status": "suspended"
    }
  }
  core.explicitly_denied with input as input_data
}

test_explicitly_denied_revoked_identity if {
  input_data := {
    "identity": {
      "status": "revoked"
    }
  }
  core.explicitly_denied with input as input_data
}

test_explicitly_denied_blocked_ip if {
  input_data := {
    "identity": {
      "status": "active"
    },
    "context": {
      "source_ip": "192.0.2.1"
    }
  }
  core.explicitly_denied with input as input_data with data.blocked_ips as ["192.0.2.1"]
}

# ============================================================================
# CROSS-TENANT TESTS
# ============================================================================

test_cross_tenant_denied_without_permission if {
  input_data := {
    "identity": {
      "tenant_id": "tenant-001",
      "permissions": []
    },
    "resource": {
      "tenant_id": "tenant-002"
    }
  }
  core.explicitly_denied with input as input_data with data.blocked_ips as []
}

test_cross_tenant_allowed_with_permission if {
  input_data := {
    "identity": {
      "tenant_id": "tenant-001",
      "permissions": ["cross_tenant_access"],
      "allowed_tenants": ["tenant-002"]
    },
    "resource": {
      "tenant_id": "tenant-002"
    }
  }
  core.cross_tenant_allowed with input as input_data
}

# ============================================================================
# STEP-UP AUTHENTICATION TESTS
# ============================================================================

test_step_up_required_for_admin_without_mfa if {
  input_data := {
    "action": "admin",
    "identity": {
      "mfa_verified": false
    }
  }
  core.step_up_required with input as input_data
}

test_step_up_not_required_for_read_with_mfa if {
  input_data := {
    "action": "read",
    "identity": {
      "mfa_verified": true
    }
  }
  not core.step_up_required with input as input_data
    with data.revoked_identities as []
    with data.allowed_locations as ["datacenter-1"]
    with data.business_hours as {"start": 0, "end": 24}
}

# ============================================================================
# AUDIT DECISION TESTS
# ============================================================================

test_audit_required_for_admin_action if {
  input_data := {
    "action": "admin",
    "resource": {}
  }
  core.audit_decision with input as input_data
}

test_audit_required_for_secret_resource if {
  input_data := {
    "action": "read",
    "resource": {
      "classification": "secret"
    }
  }
  core.audit_decision with input as input_data
}

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

test_full_authorization_flow_allowed if {
  core.allow with input as test_valid_spiffe_input
    with data.revoked_identities as []
    with data.blocked_ips as []
    with data.allowed_locations as ["datacenter-1"]
    with data.business_hours as {"start": 0, "end": 24}
    with data.resource_roles as {"data": {"read": "analyst"}}
    with data.classification_levels as {"confidential": 2, "secret": 4}
}

test_full_authorization_flow_denied_expired_session if {
  not core.allow with input as test_expired_session_input
    with data.revoked_identities as []
    with data.blocked_ips as []
    with data.allowed_locations as []
    with data.business_hours as {"start": 0, "end": 24}
}
