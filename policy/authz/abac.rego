package policy.authz.abac

import data.policy.authz.admin
import data.policy.authz.rbac
import data.policy.common.helpers
import future.keywords.if

default allow := false

permission := meta if {
  meta := rbac.permission_metadata(input.action)
}

elevated_action if {
  permission.risk == "elevated"
}

elevated_action if {
  permission.risk == "high"
}

deny contains reason if {
  rbac.deny[reason]
}

deny contains reason if {
  helpers.subject_tenant != input.resource.tenant
  reason := "tenant_mismatch"
}

deny contains reason if {
  input.resource.classification == "restricted"
  not helpers.has_clearance(input.subject.clearance, "restricted")
  reason := "insufficient_clearance"
}

deny contains reason if {
  permission.classification
  not input.resource.classification in permission.classification
  reason := "classification_blocked"
}

deny contains reason if {
  permission.environments
  not input.context.env in permission.environments
  reason := "environment_blocked"
}

deny contains reason if {
  elevated_action
  not helpers.non_empty(input.context.reason)
  reason := "reason_required"
}

deny contains reason if {
  elevated_action
  input.subject.mfa != "webauthn"
  reason := "step_up_required"
}

deny contains reason if {
  permission.time_window
  not helpers.time_in_window(input.context.time, permission.time_window)
  reason := "outside_change_window"
}

deny contains reason if {
  admin.deny[reason]
}

obligations contains "step_up_auth" if {
  elevated_action
}

obligations contains "warrant_binding" if {
  admin.obligations["warrant_binding"]
}

obligations contains "dual_control" if {
  admin.obligations["dual_control"]
}

allow if {
  rbac.allow
  count(deny) == 0
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
