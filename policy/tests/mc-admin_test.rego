package mc.admin

test_platform_admin_can_mutate_all {
  allow with input as {
    "operation": {"isMutation": true},
    "actor": {"role": "platform-admin"}
  }
}

test_tenant_admin_must_match_tenant_denied_when_mismatch {
  not allow with input as {
    "operation": {"isMutation": true},
    "actor": {"role": "tenant-admin", "tenant": "TENANT_001"},
    "tenant": "TENANT_002"
  }
}