package summit.abac

import data.abac

default decision = {
  "allow": false,
  "reason": "policy_denied",
  "obligations": []
}

default deny_reason = "policy_denied"

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
  ent := input.subject.entitlements[_]
  ent_parts := split(ent, ":")
  count(ent_parts) == 3
  ent_parts[0] == action_parts[0]
  ent_parts[1] == input.resource.id
  ent_parts[2] == action_parts[1]
}

dual_control_required {
  action := input.action
  cfg := abac.actions[action]
  object.get(cfg, "requiresDualControl", false)
}

dual_control_roles(action) = roles {
  cfg := abac.actions[action]
  roles := object.get(cfg, "dualControlRoles", [])
}

approvals = object.get(input.context, "approvals", [])

approval_for_role(role) {
  approvals[_].role == role
}

has_required_approvals(required_roles) {
  not missing_roles(required_roles)
}

missing_roles(required_roles) {
  role := required_roles[_]
  not approval_for_role(role)
}

distinct_approvers_count = count(approver_ids) {
  approver_ids := {a |
    approval := approvals[_]
    a := approval.actorId
  }
}

dual_control_satisfied {
  not dual_control_required
}

dual_control_satisfied {
  dual_control_required
  count(approvals) >= 2
  distinct_approvers_count >= 2
  required_roles := dual_control_roles(input.action)
  has_required_approvals(required_roles)
}

clearance_sufficient {
  subject_clearance_rank >= resource_classification_rank
}

step_up_needed {
  action_cfg := abac.actions[input.action]
  object.get(action_cfg, "requiresStepUp", false)
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

deny_reason = "dual_control_required" {
  tenant_match
  residency_match
  clearance_sufficient
  has_required_role(input.action)
  not dual_control_satisfied
}

obligation_item[obligation] {
  step_up_needed
  not sufficient_acr
  obligation := {
    "type": "step_up",
    "mechanism": "webauthn",
    "required_acr": "loa2"
  }
}

obligation_item[obligation] {
  dual_control_required
  not dual_control_satisfied
  required_roles := dual_control_roles(input.action)
  min_approvers := max([2, count(required_roles)])
  obligation := {
    "type": "dual_control",
    "required_roles": required_roles,
    "min_approvers": min_approvers,
    "approvals_present": approvals,
  }
}

decision := {
  "allow": true,
  "reason": "allow",
  "obligations": obligations,
} {
  allow
  obligation_list := [obligation | obligation_item[obligation]]
  obligations := obligation_list
}

decision := {
  "allow": false,
  "reason": reason,
  "obligations": obligations,
} {
  not allow
  reason := deny_reason
  obligation_list := [obligation | obligation_item[obligation]]
  obligations := obligation_list
}
