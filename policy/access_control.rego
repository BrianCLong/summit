package intelgraph.authz

default allow = false

allow {
    input.subject.role == "admin"
}

allow {
    input.subject.role == "analyst"
    input.action == "read"
    input.resource.type == "entity"
}

# Reason for access
reason = "Access denied: Insufficient role or unauthorized action/resource type." {
    not allow
}

reason = "Access granted: Subject has required role and permissions." {
    allow
}