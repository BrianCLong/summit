import future.keywords.in
import future.keywords.if
package policy.tests.authz

import data.policy.authz.abac


# Allow path for baseline analyst export

allow_report_export if {
  decision := abac.decision with input as data.policy.fixtures.analyst_report
  decision.allow
  count(decision.deny) == 0
}

# Tenant isolation enforcement

denies_cross_tenant_queries if {
  decision := abac.decision with input as data.policy.fixtures.cross_tenant
  decision.deny["tenant_mismatch"]
  not decision.allow
}

# Elevated actions require warrant + mfa

denies_missing_warrant_and_step_up if {
  decision := abac.decision with input as data.policy.fixtures.admin_impersonate_missing_warrant
  decision.deny["warrant_required"]
  decision.deny["step_up_required"]
  decision.obligations["warrant_binding"]
  not decision.allow
}

# Mutation test: drop reason for elevated action

denies_missing_reason_for_export if {
  decision := abac.decision with input as data.policy.fixtures.analyst_report_missing_reason
  decision.deny["reason_required"]
}

# Happy path for admin impersonation with warrant

allows_impersonation_with_controls if {
  decision := abac.decision with input as data.policy.fixtures.admin_impersonate
  decision.allow
  decision.obligations["warrant_binding"]
  decision.obligations["dual_control"]
}
