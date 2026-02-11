package policy.authz.admin

import data.policy.common.helpers
import data.policy.data.permissions
import future.keywords.if

admin_action if {
  startswith(input.action, "admin:")
}

impersonation_action if {
  input.action == "tenant:impersonate"
}

needs_warrant if {
  admin_action
}

needs_warrant if {
  impersonation_action
}

step_up_required if {
  needs_warrant
}

allow_break_glass if {
  needs_warrant
  input.context.break_glass == true
  input.subject.roles[_] == "admin"
}

sufficient_warrant if {
  helpers.non_empty(input.context.warrant_id)
}

satisfies_dual_control if {
  not permissions.permissions[input.action].dual_control
}

satisfies_dual_control if {
  count(input.context.approvers) > 1
}

deny contains reason if {
  needs_warrant
  not sufficient_warrant
  reason := "warrant_required"
}

deny contains reason if {
  needs_warrant
  not satisfies_dual_control
  reason := "dual_control_required"
}

deny contains reason if {
  step_up_required
  input.subject.mfa != "webauthn"
  reason := "step_up_required"
}

obligations contains "warrant_binding" if {
  needs_warrant
}

obligations contains "dual_control" if {
  permissions.permissions[input.action].dual_control
}
