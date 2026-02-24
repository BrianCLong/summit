package graphql

import future.keywords.in

import future.keywords.if

# Rules for testing
default allow := false
default allow_write := false

allow if {
  input.user.tenant == input.args.tenantId
  "coherence:read" in input.user.scope
  residency_match
}

allow if {
  input.user.tenant == input.args.tenantId
  "coherence:read:self" in input.user.scope
  residency_match
}

allow_write if {
  input.user.tenant == input.args.tenantId
  "coherence:write" in input.user.scope
  residency_match
}

allow_write if {
  input.user.tenant == input.args.tenantId
  "coherence:write:self" in input.user.scope
  residency_match
}

residency_match if {
  not input.user.residency
}

residency_match if {
  not input.args.residency
}

residency_match if {
  input.user.residency == input.args.residency
}

# Tests
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
