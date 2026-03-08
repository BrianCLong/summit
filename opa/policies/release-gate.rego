package summit.release

import future.keywords.if

default allow := false

# Allow if all GA criteria are met and no blocking issues exist
allow if {
    ci_pass
    coverage >= 85
    security_audit == "clean"
    e2e_green
    tenant_isolation_ok
    not high_vulnerabilities
    not infrastructure_drift
}

# CI pass check
ci_pass if {
    input.ci_artifacts.status == "success"
}

# Coverage check
coverage := input.test_reports.coverage

# Security audit check
security_audit := input.npm_audit.status

# E2E green check
e2e_green if {
    input.test_reports.e2e == "green"
}

# Tenant isolation check
tenant_isolation_ok if {
    input.ci_artifacts.tenant_isolation == "ok"
}

# Blocking conditions
high_vulnerabilities if {
    input.npm_audit.vulnerabilities > 5
}

infrastructure_drift if {
    input.ci_artifacts.drift_resolved == false
}

# Violation messages
violations[msg] if {
    high_vulnerabilities
    msg := "Too many vulnerabilities (>5)"
}

violations[msg] if {
    infrastructure_drift
    msg := "Unresolved infrastructure drift"
}

# Combined decision object for easier consumption
decision := {
    "allow": allow,
    "violations": violations,
    "coverage": coverage,
    "ci_pass": ci_pass,
    "security_audit": security_audit,
    "e2e_green": e2e_green,
    "tenant_isolation_ok": tenant_isolation_ok
}
