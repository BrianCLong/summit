import future.keywords
package ci.audit

# CI Gate: Enforce Audit and RFA on Privileged Routes

deny[msg] {
    # Detect new route files in gateway
    file := input.files[_]
    startswith(file.name, "apps/gateway/src/routes/")

    # Check if content includes sensitive actions (heuristic)
    content := file.content
    contains(content, "export")

    # Check if audit middleware is imported/used
    not contains(content, "auditRfaMiddleware")

    msg := sprintf("New privileged route %v must use auditRfaMiddleware", [file.name])
}

deny[msg] {
    # Ensure RFA matrix is present
    not input.files["audit/policy/rfa_matrix.yaml"]
    msg := "Missing audit/policy/rfa_matrix.yaml"
}
