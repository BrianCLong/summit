package graphql

import future.keywords.if

test_allow_same_tenant_read if {
  allow with input as {"user":{"tenant":"t1","scope":["coherence:read"]},"args":{"tenantId":"t1"}}
}

test_deny_cross_tenant if {
  not allow with input as {"user":{"tenant":"t1","scope":["coherence:read"]},"args":{"tenantId":"t2"}}
}

test_allow_same_tenant_read_self if {
  allow with input as {"user":{"tenant":"t1","scope":["coherence:read:self"]},"args":{"tenantId":"t1"}}
}

test_deny_cross_tenant_read_self if {
  not allow with input as {"user":{"tenant":"t1","scope":["coherence:read:self"]},"args":{"tenantId":"t2"}}
}

test_allow_same_tenant_write_self if {
  allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write:self"]},"args":{"tenantId":"t1"}}
}

test_deny_cross_tenant_write_self if {
  not allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write:self"]},"args":{"tenantId":"t2"}}
}

test_allow_same_tenant_read_residency if {
  allow with input as {"user":{"tenant":"t1","scope":["coherence:read"],"residency":"US"},"args":{"tenantId":"t1","residency":"US"}}
}

test_deny_cross_residency_read if {
  not allow with input as {"user":{"tenant":"t1","scope":["coherence:read"],"residency":"US"},"args":{"tenantId":"t1","residency":"EU"}}
}

test_allow_same_tenant_write_residency if {
  allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write"],"residency":"US"},"args":{"tenantId":"t1","residency":"US"}}
}

test_deny_cross_residency_write if {
  not allow_write with input as {"user":{"tenant":"t1","scope":["coherence:write"],"residency":"US"},"args":{"tenantId":"t1","residency":"EU"}}
}
