package ethics.interaction

default deny = false

# Deny if "regulator" is mentioned in a context that implies improper influence
# This is a simplified check for the "grep" output in CI
deny {
    # Input is the grep output lines
    line := input[_]
    contains(line, "regulator")
    # In a real scenario, this would be more sophisticated
    # For now, we flag any mention for review if it's not in the allowlist
    not allowed_context(line)
}

allowed_context(line) {
    contains(line, "governance/regulatory")
}
allowed_context(line) {
    contains(line, "intelligence/regulatory_signals")
}
allowed_context(line) {
    contains(line, "docs/")
}
allowed_context(line) {
    contains(line, "README.md")
}
allowed_context(line) {
    # Allow the CI file itself to mention "regulator" in the grep command
    contains(line, "ci/")
}
