# Common Authorization Policy
# Provides standard deny-by-default logic and role-based access control helpers.

package common.authz

import rego.v1

# Default decision is deny
default allow := false

# Allow if the user has the 'admin' role
allow if {
    input.user.roles[_] == "admin"
}

# Allow if the user is the owner of the resource
allow if {
    input.user.id == input.resource.owner_id
}

# Allow if the action is public
allow if {
    input.action == "read"
    input.resource.public == true
}

# Helper to check for a specific permission
has_permission(permission) if {
    some role in input.user.roles
    data.roles[role].permissions[_] == permission
}
