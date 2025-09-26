# IntelGraph OPA Policies
#
# Dynamic RBAC enforcement backed by PostgreSQL via the RBAC service.
# Policies evaluate user permissions (including wildcard support) and
# enforce tenant isolation for multi-tenant safety.

package intelgraph

import future.keywords.if
import future.keywords.in

default allow = {"allow": false, "reason": "access_denied"}

permissions := {lower(p) | input.user.permissions; p := input.user.permissions[_]}
default permissions = {}

action := lower(input.action)

public_actions := {
    "query.__typename",
    "query.health"
}

allow = decision if {
    tenant_ok
    action_permitted
    field_permitted
    decision := {
        "allow": true,
        "reason": permission_reason
    }
}

action_permitted if {
    perm := match_permission(action)
    perm != ""
    permission_reason := sprintf("permission %s", [perm])
}

action_permitted if {
    action in public_actions
    permission_reason := "public access"
}

field_permitted if {
    not input.resource.field
}

field_permitted if {
    perm := match_permission(field_identifier)
    perm != ""
}

field_identifier := sprintf(
    "field.%s.%s",
    [lower(input.resource.type), lower(input.resource.field)]
)

match_permission(target) = perm if {
    target != ""
    perm := target
    perm in permissions
}
match_permission(target) = perm if {
    permissions[_] == "*"
    perm := "*"
}
match_permission(target) = perm if {
    perm := permissions[_]
    endswith(perm, ".*")
    prefix := substring(perm, 0, count(perm) - 2)
    startswith(target, prefix)
}
match_permission(_) = "" if {
    true
}

tenant_ok if {
    not input.context.tenantId
}
tenant_ok if {
    not input.user.tenantId
}
tenant_ok if {
    lower(input.context.tenantId) == lower(input.user.tenantId)
}
