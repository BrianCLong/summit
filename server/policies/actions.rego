# Actions policy bundle
# - Marks destructive/export operations as dual-control
# - Requires two distinct approvers who are different from the requesting actor
# - Emits expiry to prevent replay of stale preflights

package actions

import future.keywords.if
import future.keywords.in

default allow_action = false
default decision_reason = "action_not_allowed"
default decision_obligations = []
policy_version := "actions-v1"
required_approvers := 2

hazardous_action(action) {
  startswith(action, "DELETE_")
}

hazardous_action(action) {
  startswith(action, "EXPORT_")
}

hazardous_action(action) {
  action == "ROTATE_KEYS"
}

hazardous_action(action) {
  action == "CHANGE_POLICY"
}

# Collect distinct approvers (excluding the requesting actor)
approver_set := {id |
  input.context.approvers != null
  id := input.context.approvers[_]
  id != input.actor.id
}

dual_control_obligation := {
  "type": "dual_control",
  "code": "DUAL_APPROVER",
  "description": "High-risk actions require two distinct approvers",
  "requiredApprovers": required_approvers,
  "approverIds": [id | id := approver_set[_]],
  "satisfied": count(approver_set) >= required_approvers,
}

decision_obligations := [dual_control_obligation] {
  hazardous_action(input.action)
}

decision_obligations := [] {
  not hazardous_action(input.action)
}

allow_action := true {
  not hazardous_action(input.action)
}

allow_action := true {
  hazardous_action(input.action)
  dual_control_obligation.satisfied
}

allow_action := false {
  hazardous_action(input.action)
  not dual_control_obligation.satisfied
}

decision_reason := "permitted" {
  not hazardous_action(input.action)
}

decision_reason := "dual_control_satisfied" {
  hazardous_action(input.action)
  dual_control_obligation.satisfied
}

decision_reason := "dual_control_required" {
  hazardous_action(input.action)
  not dual_control_obligation.satisfied
}

# Default expiry of 15 minutes for a preflight decision
expires_at := time.format_rfc3339_ns(
  time.now_ns() + 900 * 1000000000,
)

decision := {
  "allow": allow_action,
  "reason": decision_reason,
  "obligations": decision_obligations,
  "policy_version": policy_version,
  "expires_at": expires_at,
}
