package policy.authz.rbac

import data.policy.common.helpers
import data.policy.data.permissions
import data.policy.data.roles
import future.keywords.if

default allow := false

role_permissions contains perm if {
  some role
  role := input.subject.roles[_]
  perms := roles.roles[role].permissions
  perm := perms[_]
}

allow if {
  some perm
  perm := role_permissions[_]
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
