package revops.tenant_overrides

# Applies per-tenant overrides while keeping invariants intact.

import data.revops.config
import data.revops.invariants

default merged = {}

merged := out {
  tenant_id := input.tenant.id
  base := config.tenant[tenant_id]
  overrides := config.tenant_overrides[tenant_id]
  out := base
  out := merge(out, overrides)
  not invariants.violations[_] with input as input
}

merge(x, y) = z {
  z := x
  y
}
