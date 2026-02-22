package companyos.incident

import rego.v1

# Default to deny all actions unless explicitly allowed.
default allow = false

# Allow a user to create an incident if they are authenticated.
# In a real-world scenario, this would be scoped to specific roles.
allow if {
    input.action == "incident:create"
    is_authenticated(input.user)
}

# Allow a user to view an incident if they are authenticated and belong to the same tenant.
allow if {
    input.action == "incident:view"
    is_authenticated(input.user)
    input.resource.tenant_id == input.user.tenant_id
}

# Allow a user to update an incident if they are the owner or have an 'admin' role.
allow if {
    input.action == "incident:update"
    is_authenticated(input.user)
    input.resource.tenant_id == input.user.tenant_id
    is_owner_or_admin(input.user, input.resource)
}

# Helper to check if a user is authenticated.
is_authenticated(user) if {
    user.authenticated == true
}

# Helper to check if the user is the incident owner or an admin.
is_owner_or_admin(user, resource) if {
    user.id == resource.owner_id
}
is_owner_or_admin(user, resource) if {
    "admin" in user.roles
}
