import future.keywords.in
import future.keywords.if
package ga_gate

import data.intelgraph.authz.extended

# Default to denying merge
default allow_merge := false

# Allow merge if all sub-policies pass
allow_merge if {
    not secrets_found
    not sbom_critical_vulns
    not high_risk_authz_violations
    not freeze_active
}

# Secrets Check
secrets_found if {
    input.secrets_scan.count > 0
}

# SBOM Vulns
sbom_critical_vulns if {
    input.sbom.vulns.critical_vulns > 0
}

# AuthZ Invariants
high_risk_authz_violations if {
    input.authz_check.violations > 0
}

# Freeze Window Check
freeze_active if {
    input.trust_policy.ga_gate.freeze_mode == "blocking"
}

deny[msg] {
    secrets_found
    msg := "Secrets found in repository"
}

deny[msg] {
    sbom_critical_vulns
    msg := "CRITICAL/HIGH vulnerabilities found in SBOM"
}

deny[msg] {
    freeze_active
    msg := "GA Freeze Window is ACTIVE. Merges are blocked."
}
