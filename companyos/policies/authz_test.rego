# CompanyOS Authorization Policy Tests
# Tests for B1: OPA-Backed Authorization v1

package companyos.authz_test

import rego.v1
import data.companyos.authz

# ============================================================================
# GLOBAL ADMIN TESTS
# ============================================================================

test_global_admin_can_do_anything if {
    result := authz.decision with input as {
        "subject": {
            "id": "admin-1",
            "tenant_id": "tenant-1",
            "roles": ["global-admin"],
            "mfa_verified": true,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-2",
        },
        "action": "tenant:delete:confirm",
    }
    result.allow == true
}

# ============================================================================
# TENANT LIFECYCLE TESTS
# ============================================================================

test_operator_can_activate_tenant if {
    result := authz.decision with input as {
        "subject": {
            "id": "operator-1",
            "tenant_id": "tenant-1",
            "roles": ["operator"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-1",
        },
        "action": "tenant:activate",
    }
    result.allow == true
}

test_operator_cannot_access_other_tenant if {
    result := authz.decision with input as {
        "subject": {
            "id": "operator-1",
            "tenant_id": "tenant-1",
            "roles": ["operator"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-2",
        },
        "action": "tenant:activate",
    }
    result.allow == false
}

test_regular_user_cannot_suspend_tenant if {
    result := authz.decision with input as {
        "subject": {
            "id": "user-1",
            "tenant_id": "tenant-1",
            "roles": ["viewer"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-1",
        },
        "action": "tenant:suspend",
    }
    result.allow == false
}

test_delete_confirm_requires_global_admin if {
    result := authz.decision with input as {
        "subject": {
            "id": "operator-1",
            "tenant_id": "tenant-1",
            "roles": ["operator"],
            "mfa_verified": true,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-1",
        },
        "action": "tenant:delete:confirm",
    }
    result.allow == false
}

# ============================================================================
# AUDIT VIEWER TESTS (A3)
# ============================================================================

test_security_reviewer_can_read_audit if {
    result := authz.decision with input as {
        "subject": {
            "id": "reviewer-1",
            "tenant_id": "tenant-1",
            "roles": ["SECURITY_REVIEWER"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "audit",
        },
        "action": "audit:read",
    }
    result.allow == true
}

test_tenant_admin_can_read_audit if {
    result := authz.decision with input as {
        "subject": {
            "id": "admin-1",
            "tenant_id": "tenant-1",
            "roles": ["tenant-admin"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "audit",
            "tenant_id": "tenant-1",
        },
        "action": "audit:read",
    }
    result.allow == true
}

test_regular_user_cannot_read_audit if {
    result := authz.decision with input as {
        "subject": {
            "id": "user-1",
            "tenant_id": "tenant-1",
            "roles": ["analyst"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "audit",
        },
        "action": "audit:read",
    }
    result.allow == false
}

# ============================================================================
# FEATURE FLAG TESTS
# ============================================================================

test_tenant_admin_can_update_feature_flags if {
    result := authz.decision with input as {
        "subject": {
            "id": "admin-1",
            "tenant_id": "tenant-1",
            "roles": ["tenant-admin"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "feature_flag",
            "tenant_id": "tenant-1",
        },
        "action": "feature_flag:update",
    }
    result.allow == true
}

test_anyone_can_read_feature_flags if {
    result := authz.decision with input as {
        "subject": {
            "id": "user-1",
            "tenant_id": "tenant-1",
            "roles": ["viewer"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "feature_flag",
            "tenant_id": "tenant-1",
        },
        "action": "feature_flag:read",
    }
    result.allow == true
}

# ============================================================================
# MFA REQUIREMENT TESTS
# ============================================================================

test_mfa_required_for_tenant_delete if {
    result := authz.decision with input as {
        "subject": {
            "id": "admin-1",
            "tenant_id": "tenant-1",
            "roles": ["global-admin"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-1",
        },
        "action": "tenant:delete",
    }
    result.requires_mfa == true
}

test_mfa_required_for_audit_export if {
    result := authz.decision with input as {
        "subject": {
            "id": "reviewer-1",
            "tenant_id": "tenant-1",
            "roles": ["SECURITY_REVIEWER"],
            "mfa_verified": false,
        },
        "resource": {
            "type": "audit",
        },
        "action": "audit:export",
    }
    result.requires_mfa == true
}

# ============================================================================
# OBLIGATION TESTS
# ============================================================================

test_lifecycle_operations_have_audit_obligation if {
    result := authz.decision with input as {
        "subject": {
            "id": "operator-1",
            "tenant_id": "tenant-1",
            "roles": ["operator"],
            "mfa_verified": true,
        },
        "resource": {
            "type": "tenant",
            "tenant_id": "tenant-1",
        },
        "action": "tenant:suspend",
    }
    count(result.obligations) > 0
}
