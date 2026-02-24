package search
import future.keywords.if
import future.keywords.in

default allow = false

# ------------------------------------------------------------------------------
# SEARCH SERVICE POLICY
# This policy is intended to be applied at the SEARCH SERVICE level (internal),
# verifying that the Gateway has correctly injected the tenant filter.
# ------------------------------------------------------------------------------

# Allow search if tenant filter is present
allow {
    input.method == "POST"
    input.path == "/v1/search"
    # Ensure tenant isolation is enforced in the filter string
    regex.match("tenant:=", input.body.filter_by)
}

allow {
    input.method == "POST"
    input.path == "/v1/search/suggest"
    regex.match("tenant:=", input.body.filter_by)
}

# Admin endpoints require admin role
allow {
    startswith(input.path, "/v1/search/admin")
    input.user.roles[_] == "admin"
}
