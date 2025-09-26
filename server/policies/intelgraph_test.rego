# IntelGraph OPA Policy Tests
#
# These tests validate the RBAC and tenant isolation policies
# Run with: opa test policies/

package intelgraph

import future.keywords.if

#------------------------------------------------------------------------------
# TEST DATA
#------------------------------------------------------------------------------

admin_user := {
    "id": "admin-1",
    "email": "admin@intelgraph.com",
    "role": "admin",
    "identityProvider": "oidc",
    "tenantId": "tenant-1",
    "permissions": ["*"]
}

analyst_user := {
    "id": "analyst-1",
    "email": "analyst@intelgraph.com",
    "role": "analyst",
    "identityProvider": "oidc",
    "tenantId": "tenant-1",
    "permissions": ["read", "write:investigation"]
}

senior_analyst_user := {
    "id": "senior-analyst-1",
    "email": "senior@intelgraph.com",
    "role": "senior_analyst",
    "identityProvider": "oidc",
    "tenantId": "tenant-1",
    "permissions": ["read", "write", "copilot"]
}

viewer_user := {
    "id": "viewer-1",
    "email": "viewer@intelgraph.com",
    "role": "viewer",
    "identityProvider": "oidc",
    "tenantId": "tenant-1",
    "permissions": ["read"]
}

other_tenant_user := {
    "id": "other-1",
    "email": "other@intelgraph.com",
    "role": "analyst",
    "identityProvider": "oidc",
    "tenantId": "tenant-2",
    "permissions": ["read", "write"]
}

federated_saml_user := {
    "id": "saml-analyst-1",
    "email": "federated@intelgraph.com",
    "role": "analyst",
    "identityProvider": "saml",
    "tenantId": "tenant-1",
    "permissions": ["read", "write:investigation"],
    "roles": ["analyst", "senior_analyst"]
}

#------------------------------------------------------------------------------
# ADMIN ACCESS TESTS
#------------------------------------------------------------------------------

test_admin_full_access if {
    allow with input as {
        "user": admin_user,
        "action": "mutation.deleteInvestigation",
        "resource": {"type": "Investigation", "args": {"id": "inv-1"}},
        "context": {"tenantId": "tenant-1"}
    }
}

test_admin_cross_tenant_access if {
    allow with input as {
        "user": admin_user,
        "action": "query.investigation", 
        "resource": {"type": "Investigation", "args": {"id": "inv-1"}},
        "context": {"tenantId": "tenant-2"}
    }
}

#------------------------------------------------------------------------------
# ANALYST ACCESS TESTS
#------------------------------------------------------------------------------

test_analyst_read_access if {
    allow with input as {
        "user": analyst_user,
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_analyst_write_access if {
    allow with input as {
        "user": analyst_user,
        "action": "mutation.createInvestigation",
        "resource": {"type": "Mutation", "field": "createInvestigation"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_analyst_entity_operations if {
    allow with input as {
        "user": analyst_user,
        "action": "mutation.createEntity",
        "resource": {"type": "Entity", "args": {"investigationId": "inv-1"}},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
}

test_analyst_copilot_access if {
    allow with input as {
        "user": senior_analyst_user,
        "action": "mutation.startCopilotRun",
        "resource": {"type": "CopilotRun", "args": {"investigationId": "inv-1"}},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
}

#------------------------------------------------------------------------------
# TENANT ISOLATION TESTS
#------------------------------------------------------------------------------

test_tenant_isolation_deny if {
    not allow with input as {
        "user": analyst_user,
        "action": "query.investigation",
        "resource": {"type": "Investigation", "args": {"id": "inv-1"}},
        "context": {"tenantId": "tenant-2"}  # Different tenant
    }
}

test_cross_tenant_entity_access_denied if {
    not allow with input as {
        "user": analyst_user,
        "action": "mutation.createEntity",
        "resource": {"type": "Entity", "args": {"investigationId": "inv-1"}},
        "context": {"tenantId": "tenant-2", "investigationId": "inv-1"}
    }
}

test_other_tenant_user_denied if {
    not allow with input as {
        "user": other_tenant_user,
        "action": "query.investigation",
        "resource": {"type": "Investigation", "args": {"id": "inv-1"}},
        "context": {"tenantId": "tenant-1"}  # Accessing tenant-1 data
    }
}

#------------------------------------------------------------------------------
# ROLE-BASED ACCESS TESTS
#------------------------------------------------------------------------------

test_viewer_read_only if {
    allow with input as {
        "user": viewer_user,
        "action": "query.investigations", 
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_viewer_write_denied if {
    not allow with input as {
        "user": viewer_user,
        "action": "mutation.createInvestigation",
        "resource": {"type": "Mutation", "field": "createInvestigation"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_no_role_denied if {
    not allow with input as {
        "user": {"id": "no-role", "tenantId": "tenant-1"},
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"}, 
        "context": {"tenantId": "tenant-1"}
    }
}

#------------------------------------------------------------------------------
# SELF-ACCESS TESTS
#------------------------------------------------------------------------------

test_user_own_profile_access if {
    allow with input as {
        "user": analyst_user,
        "action": "query.user",
        "resource": {"type": "User", "args": {"id": "analyst-1"}},
        "context": {"tenantId": "tenant-1"}
    }
}

test_user_other_profile_denied if {
    not allow with input as {
        "user": analyst_user,
        "action": "query.user",
        "resource": {"type": "User", "args": {"id": "other-user"}},
        "context": {"tenantId": "tenant-1"}
    }
}

#------------------------------------------------------------------------------
# FEDERATED IDENTITY TESTS
#------------------------------------------------------------------------------

test_saml_identity_allowed_by_default if {
    allow with input as {
        "user": federated_saml_user,
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_saml_identity_requires_matching_provider if {
    not allow with input as {
        "user": federated_saml_user,
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1", "requiredIdentityProviders": ["oidc"]}
    }
}

test_saml_identity_allowed_when_required if {
    allow with input as {
        "user": federated_saml_user,
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1", "requiredIdentityProviders": ["saml"]}
    }
}

#------------------------------------------------------------------------------
# PUBLIC ACCESS TESTS  
#------------------------------------------------------------------------------

test_health_check_public if {
    allow with input as {
        "user": {},
        "action": "query.__typename",
        "resource": {"type": "Query", "field": "__typename"},
        "context": {}
    }
}

test_health_check_with_user if {
    allow with input as {
        "user": analyst_user,
        "action": "query.health", 
        "resource": {"type": "Query", "field": "health"},
        "context": {}
    }
}

#------------------------------------------------------------------------------
# IMPORT OPERATIONS TESTS
#------------------------------------------------------------------------------

test_analyst_csv_import if {
    allow with input as {
        "user": analyst_user,
        "action": "mutation.startCSVImport",
        "resource": {"type": "Import", "field": "startCSVImport"},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
}

test_viewer_import_denied if {
    not allow with input as {
        "user": viewer_user,
        "action": "mutation.startCSVImport",
        "resource": {"type": "Import", "field": "startCSVImport"},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
}

#------------------------------------------------------------------------------
# SENSITIVE FIELD TESTS
#------------------------------------------------------------------------------

test_admin_sensitive_field_access if {
    allow with input as {
        "user": admin_user,
        "action": "query.user",
        "resource": {"type": "User", "field": "email"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_user_own_sensitive_field if {
    allow with input as {
        "user": analyst_user,
        "action": "query.user",
        "resource": {"type": "User", "field": "email", "args": {"id": "analyst-1"}},
        "context": {"tenantId": "tenant-1"}
    }
}

test_user_other_sensitive_field_denied if {
    not allow with input as {
        "user": analyst_user,
        "action": "query.user",
        "resource": {"type": "User", "field": "role", "args": {"id": "other-user"}},
        "context": {"tenantId": "tenant-1"}
    }
}

#------------------------------------------------------------------------------
# DEVELOPMENT ENVIRONMENT TESTS
#------------------------------------------------------------------------------

test_dev_environment_access if {
    allow with input as {
        "user": {"id": "dev-user", "email": "dev@test.intelgraph.com", "role": "tester"},
        "action": "mutation.createInvestigation",
        "resource": {"type": "Investigation"},
        "context": {"environment": "development", "tenantId": "test-tenant"}
    }
}

#------------------------------------------------------------------------------
# COMPLEX SCENARIO TESTS
#------------------------------------------------------------------------------

test_investigation_workflow if {
    # Test complete investigation workflow
    allow with input as {
        "user": analyst_user,
        "action": "mutation.createInvestigation",
        "resource": {"type": "Investigation"},
        "context": {"tenantId": "tenant-1"}
    }
    
    allow with input as {
        "user": analyst_user,
        "action": "mutation.createEntity",
        "resource": {"type": "Entity"},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
    
    allow with input as {
        "user": senior_analyst_user,
        "action": "mutation.startCopilotRun",
        "resource": {"type": "CopilotRun"},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
}

test_cross_tenant_data_leak_prevention if {
    # Ensure no cross-tenant data access
    not allow with input as {
        "user": analyst_user,  # tenant-1
        "action": "query.investigation",
        "resource": {"type": "Investigation", "args": {"id": "inv-2"}},
        "context": {"tenantId": "tenant-2"}  # Different tenant
    }
    
    not allow with input as {
        "user": other_tenant_user,  # tenant-2
        "action": "query.entities",
        "resource": {"type": "Entity"},
        "context": {"tenantId": "tenant-1", "investigationId": "inv-1"}
    }
}

#------------------------------------------------------------------------------
# NEGATIVE TESTS (SHOULD DENY)
#------------------------------------------------------------------------------

test_anonymous_user_denied if {
    not allow with input as {
        "user": {},
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1"}
    }
}

test_missing_tenant_context if {
    not allow with input as {
        "user": analyst_user,
        "action": "query.investigation",
        "resource": {"type": "Investigation", "args": {"id": "inv-1"}},
        "context": {}  # No tenant context
    }
}

test_invalid_role if {
    not allow with input as {
        "user": {"id": "invalid", "role": "invalid_role", "tenantId": "tenant-1"},
        "action": "query.investigations",
        "resource": {"type": "Query", "field": "investigations"},
        "context": {"tenantId": "tenant-1"}
    }
}