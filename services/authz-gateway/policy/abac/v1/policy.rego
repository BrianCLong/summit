import future.keywords
package summit.abac.v1

default allow = false
default reason = "policy_default_deny"
default obligations = []

clearance_order[level] := rank {
  rank := data.classification.levels[level]
}

auth_strength_order := {"loa1": 1, "loa2": 2, "loa3": 3}

input_valid {
  input.subject
  input.resource
  input.action
}

subject_region := region {
  region := lower(input.subject.region)
} else := region {
  region := lower(input.subject.residency)
}

resource_residency := residency {
  residency := lower(input.resource.residency)
}

residency_ok {
  resource_residency == subject_region
}
residency_ok {
  resource_residency == allowed
  allowed := data.residency.allowed_global[_]
}

clearance_ok {
  required := clearance_order[input.resource.classification]
  have := clearance_order[input.subject.clearance]
  have >= required
}

ownership_ok {
  not input.resource.owner
}
ownership_ok {
  lower(input.subject.org) == lower(input.resource.owner)
}

role_ok {
  allowed := data.actions[lower(input.action)].roles[_]
  subject_role := lower(input.subject.role)
  subject_role == lower(allowed)
}
role_ok {
  allowed := data.actions[lower(input.action)].roles[_]
  role := lower(input.subject.roles[_])
  role == lower(allowed)
}

step_up_required {
  lower(input.action) == "export"
  min := auth_strength_order[lower(data.step_up.min_auth_strength)]
  have := auth_strength_order[lower(input.subject.auth_strength)]
  have < min
}

allow {
  input_valid
  residency_ok
  clearance_ok
  ownership_ok
  role_ok
  not step_up_required
}

reason = "residency_mismatch" { input_valid; not residency_ok }
reason = "insufficient_clearance" { input_valid; residency_ok; not clearance_ok }
reason = "ownership_mismatch" { input_valid; residency_ok; clearance_ok; not ownership_ok }
reason = "role_mismatch" {
  input_valid
  residency_ok
  clearance_ok
  ownership_ok
  not role_ok
}
reason = "step_up_required" {
  input_valid
  residency_ok
  clearance_ok
  ownership_ok
  role_ok
  step_up_required
}

obligations = [o] {
  step_up_required
  o := data.step_up.obligation
}
