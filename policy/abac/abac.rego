package summit.abac

import data.abac

default decision = {
  "allow": false,
  "reason": "policy_denied",
  "obligations": []
}

dual_control_required {
  abac.actions[input.action].requiresDualControl == true
}

dual_control_approvals := approvals {
  approvals := input.context.dualControlApprovals
}

dual_control_approvals := [] {
  not input.context.dualControlApprovals
}

distinct_approvals := {approval | approval := dual_control_approvals[_]}

dual_control_satisfied {
  not dual_control_required
}

dual_control_satisfied {
  dual_control_required
  valid := {approval | distinct_approvals[approval]; approval != input.subject.id}
  count(valid) >= 2
}

clearance_rank(level) = rank {
  rank := abac.clearance_rank[level]
}

subject_clearance_rank = clearance_rank(input.subject.clearance)
resource_classification_rank = clearance_rank(input.resource.classification)

tenant_match {
  input.subject.tenantId == input.resource.tenantId
}

residency_match {
  allowed := abac.residency_matrix[input.subject.residency]
  allowed[_] == input.resource.residency
}

has_required_role(action) {
  required := abac.actions[action].allowedRoles
  count(required) == 0
}

has_required_role(action) {
  required := abac.actions[action].allowedRoles
  role := required[_]
  input.subject.roles[_] == role
}

has_required_role(action) {
  action_parts := split(action, ":")
  count(action_parts) == 2
  entitlement := input.subject.entitlements[_]
  ent_parts := split(entitlement, ":")
  count(ent_parts) == 3
  ent_parts[0] == action_parts[0]
  ent_parts[1] == input.resource.id
  ent_parts[2] == action_parts[1]
}

clearance_sufficient {
  subject_clearance_rank >= resource_classification_rank
}

step_up_needed {
  abac.actions[input.action].requiresStepUp
}

step_up_needed {
  input.context.protectedActions[_] == input.action
}

step_up_needed {
  resource_classification_rank >= clearance_rank("confidential")
}

sufficient_acr {
  input.context.currentAcr == "loa2"
}

allow {
  tenant_match
  residency_match
  clearance_sufficient
  has_required_role(input.action)
  dual_control_satisfied
}

deny_reason := "tenant_mismatch" {
  not tenant_match
} else := "residency_mismatch" {
  tenant_match
  not residency_match
} else := "insufficient_clearance" {
  tenant_match
  residency_match
  not clearance_sufficient
} else := "least_privilege_violation" {
  tenant_match
  residency_match
  clearance_sufficient
  not has_required_role(input.action)
} else := "dual_control_required" {
  tenant_match
  residency_match
  clearance_sufficient
  has_required_role(input.action)
  dual_control_required
  not dual_control_satisfied
} else := "policy_denied" {
  true
}

obligation_set[obligation] {
  step_up_needed
  not sufficient_acr
  obligation := {
    "type": "step_up",
    "mechanism": "webauthn",
    "required_acr": "loa2"
  }
}

obligation_set[obligation] {
  dual_control_required
  not dual_control_satisfied
  obligation := {
    "type": "dual_control",
    "required_approvals": 2
  }
}

decision := {
  "allow": true,
  "reason": "allow",
  "obligations": obligations,
} {
  allow
  obligations := [obligation | obligation_set[obligation]]
}

decision := {
  "allow": false,
  "reason": reason,
  "obligations": obligations,
} {
  not allow
  reason := deny_reason
  obligations := [obligation | obligation_set[obligation]]
}
