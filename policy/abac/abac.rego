package summit.abac

import data.abac

default decision = {
  "allow": false,
  "reason": "policy_denied",
  "obligations": []
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
  allowed[input.resource.residency]
}

has_required_role(action) {
  required := abac.actions[action].allowedRoles
  count(required) == 0
}

has_required_role(action) {
  required := abac.actions[action].allowedRoles
  some role
  required[role]
  input.subject.roles[_] == role
}

has_required_role(action) {
  action_parts := split(action, ":")
  count(action_parts) == 2
  some ent
  input.subject.entitlements[_] == ent
  ent_parts := split(ent, ":")
  count(ent_parts) == 3
  ent_parts[0] == action_parts[0]
  ent_parts[1] == input.resource.id
  ent_parts[2] == action_parts[1]
}

clearance_sufficient {
  subject_clearance_rank >= resource_classification_rank
}

step_up_needed {
  input.action == action
  abac.actions[action].requiresStepUp
}

step_up_needed {
  input.action == action
  input.context.protectedActions[_] == action
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
}

deny_reason = "tenant_mismatch" {
  not tenant_match
}

deny_reason = "residency_mismatch" {
  tenant_match
  not residency_match
}

deny_reason = "insufficient_clearance" {
  tenant_match
  residency_match
  not clearance_sufficient
}

deny_reason = "least_privilege_violation" {
  tenant_match
  residency_match
  clearance_sufficient
  not has_required_role(input.action)
}

deny_reason = "policy_denied" {
  true
}

obligations[obligation] {
  step_up_needed
  not sufficient_acr
  obligation := {
    "type": "step_up",
    "mechanism": "webauthn",
    "required_acr": "loa2"
  }
}

decision := {
  "allow": true,
  "reason": "allow",
  "obligations": obligations,
} {
  allow
  obligations := [obligation | obligations[obligation]]
}

decision := {
  "allow": false,
  "reason": reason,
  "obligations": obligations,
} {
  not allow
  reason := deny_reason
  obligations := [obligation | obligations[obligation]]
}
