package policy.authz.abac

import data.policy.authz.admin
import data.policy.authz.rbac
import data.policy.common.helpers
import future.keywords.if

default allow := false

permission := meta if {
  meta := rbac.permission_metadata(input.action)
}

elevated_action {
  permission.risk == "elevated"
} {
  permission.risk == "high"
}

deny[reason] {
  rbac.deny[reason]
}

deny[reason] {
  helpers.subject_tenant != input.resource.tenant
  reason := "tenant_mismatch"
}

deny[reason] {
  input.resource.classification == "restricted"
  not helpers.has_clearance(input.subject.clearance, "restricted")
  reason := "insufficient_clearance"
}

deny[reason] {
  permission.classification
  not permission.classification[_] == input.resource.classification
  reason := "classification_blocked"
}

deny[reason] {
  permission.environments
  not input.context.env in permission.environments
  reason := "environment_blocked"
}

deny[reason] {
  elevated_action
  not helpers.non_empty(input.context.reason)
  reason := "reason_required"
}

deny[reason] {
  elevated_action
  input.subject.mfa != "webauthn"
  reason := "step_up_required"
}

deny[reason] {
  permission.time_window
  not helpers.time_in_window(input.context.time, permission.time_window)
  reason := "outside_change_window"
}

deny[reason] {
  admin.deny[reason]
}

obligations["step_up_auth"] {
  elevated_action
}

obligations["warrant_binding"] {
  admin.obligations["warrant_binding"]
}

obligations["dual_control"] {
  admin.obligations["dual_control"]
}

allow {
  rbac.allow
  not deny[_]
}

decision := {
  "allow": allow,
  "deny": deny,
  "obligations": obligations,
  "metadata": {
    "tenant": helpers.subject_tenant,
    "action": input.action,
    "risk": permission.risk,
  }
}
