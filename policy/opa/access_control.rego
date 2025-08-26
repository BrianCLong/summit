
package intelgraph.authz

default allow = false

allow {
    input.method == "GET"
    input.path = ["data", "read"]
    input.user.roles[_] == "reader"
}

allow {
    input.method == "POST"
    input.path = ["data", "write"]
    input.user.roles[_] == "writer"
}

# Placeholder for more complex ABAC/RBAC rules, warrant/authority binding,
# and license/TOS enforcement.
