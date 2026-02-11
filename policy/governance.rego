
package governance

import future.keywords.contains
import future.keywords.if

default allow := false

# Allow access if no violations
allow if {
    not any_violations
}

# Check for violations based on context
any_violations if {
    violation[_]
}

# Violation: High risk use case without mitigation
violation contains "high_risk_use_case" if {
    input.risk_score >= 90
    input.mitigation != "DENY"
}

# Violation: Disallowed sector
violation contains "disallowed_sector" if {
    disallowed_sectors := {"gambling", "predatory_lending", "authoritarian_surveillance"}
    disallowed_sectors[input.sector]
}

# Violation: Guardrail breach
violation contains "guardrail_breach" if {
    input.guardrail_check.allowed == false
}

# Policy: Governance Approval for High Risk
requires_approval if {
    input.risk_score >= 70
}

# Helper to get risk mitigation requirements
mitigation := res if {
    input.risk_score >= 90
    res := "DENY"
} else := res if {
    input.risk_score >= 70
    res := "REVIEW"
} else := res if {
    input.risk_score >= 50
    res := "RESTRICT"
} else := res if {
    input.risk_score >= 30
    res := "PHILANTHROPIC_OFFSET"
} else := "NONE"
