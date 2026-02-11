import future.keywords.in
package opa.intelgraph.authz

import future.keywords.if
import future.keywords.contains

default allow := false

allow if {
    input.method == "GET"
    input.path = ["data", "read"]
    input.user.roles[_] == "reader"
}

allow if {
    input.method == "POST"
    input.path = ["data", "write"]
    input.user.roles[_] == "writer"
}

# Placeholder for more complex ABAC/RBAC rules, warrant/authority binding,
# and license/TOS enforcement.
