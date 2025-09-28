package mc.admin.v043
import data.mc.admin

default allow = false
base := data.mc.admin.decision

# Residency: requested quantum region must match tenant residency tag
deny[msg] {
  input.operation.name == "quantumSubmit"
  input.operation.variables.input.regionId != input.actor.region
  msg := "qc_residency_violation"
}

# Budgets: forbid when projected minutes exceed hard ceiling
deny[msg] {
  input.operation.name == "quantumSubmit"
  projected := input.operation.variables.input.payload.costMinutes
  ceiling := input.tenant.budget.hardCeiling
  projected + input.tenant.budget.minutesUsed > ceiling
  msg := "qc_budget_exceeded"
}

# Only platform‑admin may set tenant QC budgets; HITL required
deny[msg] {
  input.operation.name == "qcBudgetsSet"
  input.actor.role != "platform-admin"
  msg := "role_platform_admin_required"
}
deny[msg] {
  input.operation.name == "qcBudgetsSet"
  not input.context.hitl
  msg := "hitl_required"
}

allow { base.allow }
decision = {"allow": allow, "deny": base.deny ++ deny}