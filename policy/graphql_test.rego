package graphql

test_allow_same_tenant_read {
  allow with input as {"user":{"tenant":"t1","scope":["coherence:read"]},"args":{"tenantId":"t1"}}
}

test_deny_cross_tenant {
  not allow with input as {"user":{"tenant":"t1","scope":["coherence:read"]},"args":{"tenantId":"t2"}}
}

test_allow_same_tenant_read_self {
  allow with input as {"user":{"tenant":"t1","scope":["coherence:read:self"]},"args":{"tenantId":"t1"}}
}

test_deny_cross_tenant_read_self {
  not allow with input as {"user":{"tenant":"t1","scope":["coherence:read:self"]},"args":{"tenantId":"t2"}}
}

test_allow_same_tenant_write_self {
  allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write:self"]},"args":{"tenantId":"t1"}}
}

test_deny_cross_tenant_write_self {
  not allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write:self"]},"args":{"tenantId":"t2"}}
}

test_allow_same_tenant_read_residency {
  allow with input as {"user":{"tenant":"t1","scope":["coherence:read"],"residency":"US"},"args":{"tenantId":"t1","residency":"US"}}
}

test_deny_cross_residency_read {
  not allow with input as {"user":{"tenant":"t1","scope":["coherence:read"],"residency":"US"},"args":{"tenantId":"t1","residency":"EU"}}
}

test_allow_same_tenant_write_residency {
  allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write"],"residency":"US"},"args":{"tenantId":"t1","residency":"US"}}
}

test_deny_cross_residency_write {
  not allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write"],"residency":"US"},"args":{"tenantId":"t1","residency":"EU"}}
}
