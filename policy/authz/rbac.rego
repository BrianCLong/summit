package policy.authz.rbac

import future.keywords.in
import future.keywords.contains

import data.policy.common.helpers
import data.policy.data.permissions
import data.policy.data.roles
import future.keywords.if

default allow := false

role_permissions contains perm if {
  some role in input.subject.roles
  perms := roles.roles[role].permissions
  some perm in perms
}

allow if {
  some perm in role_permissions
  helpers.allows_action(perm, input.action)
}

deny contains reason if {
  not input.subject.roles
  reason := "missing_roles"
}

deny contains reason if {
  not allow
  reason := "role_missing_permission"
}

permission_metadata(action) := meta if {
  meta := permissions.permissions[action]
}
