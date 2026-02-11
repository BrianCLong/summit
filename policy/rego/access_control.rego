import future.keywords.in
import future.keywords.if
package rego.intelgraph.authz

default allow := false

allow if {
    input.subject.role == "admin"
}

allow if {
    input.subject.role == "analyst"
    input.action == "read"
    input.resource.type == "entity"
}

# Reason for access
reason := "Access denied: Insufficient role or unauthorized action/resource type." if {
    not allow
}

reason := "Access granted: Subject has required role and permissions." if {
    allow
}
