import future.keywords
package maestro.authz

import data.maestro.role_catalog
import data.maestro.attributes
import data.maestro.budget_limits

default allow = false
default reason = "unauthorized"
default reasons = []
default attrs_used = [
  "tenantId",
  "role",
  "action",
  "resource",
  "resourceAttributes",
  "subjectAttributes"
]

privileged_actions := {
  "start_run",
  "cancel_run",
  "approve_step",
  "override",
  "export_receipts",
  "delete_run"
}

is_privileged_action {
  privileged_actions[input.action]
}

normalized_role := lower(input.role)

allowed_actions := object.get(role_catalog.roles[normalized_role], "actions", [])
required_attrs := object.get(role_catalog.roles[normalized_role], "attributes_required", [])

action_allowed {
  allowed_actions[_] == input.action
}

missing_attrs[attr] {
  required_attrs[_] == attr
  attributes[attr]
  not input.subjectAttributes[attr]
}

allow {
  not is_privileged_action
}

reason := "non_privileged_action" {
  not is_privileged_action
}

reasons := ["non_privileged_action"] {
  not is_privileged_action
}

allow {
  is_privileged_action
  action_allowed
  count(missing_attrs) == 0
  budget_allowed
}

reason := "role_allowed_action" {
  is_privileged_action
  action_allowed
  count(missing_attrs) == 0
  budget_allowed
}

reasons := ["role_allowed_action"] {
  is_privileged_action
  action_allowed
  count(missing_attrs) == 0
  budget_allowed
}

reason := "budget_exceeds_limit" {
  is_privileged_action
  action_allowed
  count(missing_attrs) == 0
  not budget_allowed
  input.action == "start_run"
}

reasons := ["budget_exceeds_limit"] {
  is_privileged_action
  action_allowed
  count(missing_attrs) == 0
  not budget_allowed
  input.action == "start_run"
}

reason := "role_not_authorized" {
  is_privileged_action
  not action_allowed
}

reasons := ["role_not_authorized"] {
  is_privileged_action
  not action_allowed
}

reason := "missing_required_attributes" {
  is_privileged_action
  action_allowed
  count(missing_attrs) > 0
}

reasons := ["missing_required_attributes"] {
  is_privileged_action
  action_allowed
  count(missing_attrs) > 0
}

attrs_used := ["role", "action", "subjectAttributes", "resourceAttributes", "tenantId"] {
  is_privileged_action
}

attrs_used := ["role", "action", "resource", "tenantId"] {
  not is_privileged_action
}

budget_request := input.resourceAttributes.reasoningBudget

budget_config := object.get(budget_limits.roles, normalized_role, budget_limits.defaults)

budget_allowed {
  not budget_request
}

budget_allowed {
  budget_request
  budget_request.thinking_budget <= budget_config.thinking_budget
  budget_request.max_tokens <= budget_config.max_tokens
  budget_request.tool_budget <= budget_config.tool_budget
  budget_request.time_budget_ms <= budget_config.time_budget_ms
}
