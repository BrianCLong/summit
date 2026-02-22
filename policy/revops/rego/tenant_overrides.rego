package revops.tenant_overrides
import future.keywords.if

# Applies per-tenant overrides while keeping invariants intact.

import data.revops.config
import data.revops.invariants

default merged := {}

merged := result if {
  tenant_id := input.tenant.id
  base := config.tenant[tenant_id]
  overrides := config.tenant_overrides[tenant_id]
  result := merge(base, overrides)
  count(invariants.violations) == 0 with input as input
}

merge(x, y) := z if {
  z := x
  y
}
