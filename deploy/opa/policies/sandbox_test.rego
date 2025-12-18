# Sandbox Policy Tests
#
# Unit tests for sandbox tenant policy enforcement

package intelgraph.sandbox

import future.keywords.if

# Test: Non-sandbox tenant allowed
test_non_sandbox_allowed if {
    allow with input as {
        "tenant": {"type": "production"},
        "operation": "query"
    }
}

# Test: Sandbox tenant with valid operation allowed
test_sandbox_valid_operation if {
    allow with input as {
        "tenant": {"type": "sandbox"},
        "sandbox_id": "sandbox-123",
        "tenant_id": "sandbox-123",
        "operation": "query",
        "data_source": "synthetic",
        "sandbox_config": {
            "data_access_mode": "synthetic_only",
            "status": "active"
        }
    }
}

# Test: Federation blocked for sandbox
test_federation_blocked if {
    operation_blocked with input as {
        "tenant": {"type": "sandbox"},
        "operation": "federation"
    }
}

# Test: Cross tenant access blocked
test_cross_tenant_blocked if {
    operation_blocked with input as {
        "tenant": {"type": "sandbox"},
        "operation": "cross_tenant_access"
    }
}

# Test: Production linkback blocked
test_linkback_blocked if {
    operation_blocked with input as {
        "tenant": {"type": "sandbox"},
        "operation": "production_linkback"
    }
}

# Test: Federation connector blocked
test_federation_connector_blocked if {
    connector_blocked with input as {
        "connector_type": "federation"
    }
}

# Test: External service connector blocked
test_external_service_blocked if {
    connector_blocked with input as {
        "connector_type": "external_service"
    }
}

# Test: Production database blocked
test_production_db_blocked if {
    connector_blocked with input as {
        "connector_type": "database",
        "target_database": "production"
    }
}

# Test: Linkback attempt detected via production IDs
test_linkback_detected_prod_ids if {
    linkback_attempt with input as {
        "operation": "query",
        "entity_ids": ["prod_123", "sandbox_456"]
    }
}

# Test: Linkback attempt detected via export
test_linkback_detected_export if {
    linkback_attempt with input as {
        "operation": "export",
        "sandbox_id": "sandbox-123",
        "target_tenant_id": "production-456"
    }
}

# Test: PII detected in fields
test_pii_detected if {
    pii_detected with input as {
        "fields": ["name", "email", "address", "status"]
    }
}

# Test: PII blocked when handling is block
test_pii_blocked if {
    pii_blocked with input as {
        "fields": ["ssn", "name"],
        "sandbox_config": {
            "pii_handling": "block"
        }
    }
}

# Test: Export blocked when disabled
test_export_blocked_disabled if {
    export_blocked with input as {
        "operation": "export",
        "sandbox_config": {
            "max_export_mb": 0
        }
    }
}

# Test: Export blocked for external when not allowed
test_export_blocked_external if {
    export_blocked with input as {
        "operation": "export",
        "external_export": true,
        "sandbox_config": {
            "max_export_mb": 100,
            "allow_external_exports": false
        }
    }
}

# Test: Rate limit exceeded
test_rate_limit if {
    rate_limit_exceeded with input as {
        "operation_count": 100,
        "sandbox_config": {
            "max_executions_per_hour": 50
        }
    }
}

# Test: Tenant data filters applied
test_data_filters if {
    filters := tenant_data_filters with input as {
        "tenant": {"type": "sandbox"},
        "sandbox_id": "sandbox-123"
    }
    count(filters) > 0
}

# Test: Audit required for export
test_audit_required_export if {
    should_audit with input as {
        "operation": "export",
        "sandbox_config": {}
    }
}

# Test: Audit required for PII detection
test_audit_required_pii if {
    should_audit with input as {
        "operation": "query",
        "fields": ["email"],
        "sandbox_config": {}
    }
}

# Test: Sandbox expired check
test_sandbox_expired if {
    sandbox_expired with input as {
        "sandbox_config": {
            "expires_at": "2020-01-01T00:00:00Z"
        }
    }
}

# Test: Sandbox inactive check
test_sandbox_inactive if {
    not sandbox_active with input as {
        "sandbox_config": {
            "status": "suspended"
        }
    }
}

# Test: Compliance check passes for valid sandbox
test_compliance_check_valid if {
    result := compliance_check with input as {
        "tenant": {"type": "sandbox"},
        "sandbox_id": "sandbox-123",
        "tenant_id": "sandbox-123",
        "operation": "query",
        "data_source": "synthetic"
    }
    result.passed == true
    result.linkback_safe == true
}

# Test: Data access valid for synthetic mode
test_data_access_synthetic if {
    data_access_valid with input as {
        "sandbox_config": {
            "data_access_mode": "synthetic_only"
        },
        "data_source": "synthetic"
    }
}

# Test: Data access valid for anonymized mode
test_data_access_anonymized if {
    data_access_valid with input as {
        "sandbox_config": {
            "data_access_mode": "anonymized"
        },
        "data_anonymized": true
    }
}

# Test: Tenant isolation valid for sandbox scope
test_tenant_isolation if {
    tenant_isolation_valid with input as {
        "sandbox_id": "sandbox-123",
        "tenant_id": "sandbox-123"
    }
}

# Test: Tenant isolation valid for synthetic data
test_tenant_isolation_synthetic if {
    tenant_isolation_valid with input as {
        "sandbox_id": "sandbox-123",
        "tenant_id": "other-123",
        "data_source": "synthetic"
    }
}
