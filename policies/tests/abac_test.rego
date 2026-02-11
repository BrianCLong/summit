
package policies

# Test tenant isolation: user from tenant A cannot access tenant B data
test_deny_cross_tenant_access {
    deny with input as {
        "principal": {"tenant_id": "tenant-a", "roles": ["user"]},
        "resource": {"tenant_id": "tenant-b"}
    }
}

# Test tenant isolation: user from tenant A CAN access tenant A data
test_allow_same_tenant_access {
    count(allow) == 1 with input as {
        "principal": {"tenant_id": "tenant-a", "roles": ["user"]},
        "resource": {"tenant_id": "tenant-a"}
    }
}
