
package governance

default allow = false

# Allow access if no violations
allow {
    not any_violations
}

# Check for violations based on context
any_violations {
    violation[_]
}

# Violation: High risk use case without mitigation
violation["high_risk_use_case"] {
    input.risk_score >= 90
    input.mitigation != "DENY"
}

# Violation: Disallowed sector
violation["disallowed_sector"] {
    disallowed_sectors := {"gambling", "predatory_lending", "authoritarian_surveillance"}
    disallowed_sectors[input.sector]
}

# Violation: Guardrail breach
violation["guardrail_breach"] {
    input.guardrail_check.allowed == false
}

# Policy: Governance Approval for High Risk
requires_approval {
    input.risk_score >= 70
}

# Helper to get risk mitigation requirements
mitigation = res {
    input.risk_score >= 90
    res := "DENY"
} else = res {
    input.risk_score >= 70
    res := "REVIEW"
} else = res {
    input.risk_score >= 50
    res := "RESTRICT"
} else = res {
    input.risk_score >= 30
    res := "PHILANTHROPIC_OFFSET"
} else = "NONE"
