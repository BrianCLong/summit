package policy.authz.admin

import data.policy.common.helpers
import data.policy.data.permissions

admin_action {
  startswith(input.action, "admin:")
}

impersonation_action {
  input.action == "tenant:impersonate"
}

needs_warrant {
  admin_action
} {
  impersonation_action
}

step_up_required {
  needs_warrant
}

allow_break_glass {
  needs_warrant
  input.context.break_glass == true
  input.subject.roles[_] == "admin"
}

sufficient_warrant {
  helpers.non_empty(input.context.warrant_id)
}

satisfies_dual_control {
  not permissions.permissions[input.action].dual_control
} {
  count(input.context.approvers) > 1
}

deny[reason] {
  needs_warrant
  not sufficient_warrant
  reason := "warrant_required"
}

deny[reason] {
  needs_warrant
  not satisfies_dual_control
  reason := "dual_control_required"
}

deny[reason] {
  step_up_required
  input.subject.mfa != "webauthn"
  reason := "step_up_required"
}

obligations["warrant_binding"] {
  needs_warrant
}

obligations["dual_control"] {
  permissions.permissions[input.action].dual_control
}
