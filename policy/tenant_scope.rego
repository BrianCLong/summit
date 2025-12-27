package intelgraph.tenant

default allow = false

# Allow if user tenant matches resource tenant (assuming resource is tagged or args contain tenant_id)
allow {
    input.user.tenant_id == input.resource.tenant_id
}

# Allow if user is system admin
allow {
    input.user.role == "admin"
}

# Allow system internal operations
allow {
    input.user.sub == "system"
}
