package ci_gate

import future.keywords.contains
import future.keywords.if

import data.supply_chain
import data.ci_agent_gate

# CI Gate Policy
# Enforces security requirements for Pull Requests and Pre-Merge builds
# This is a subset of the full supply chain policy, excluding signing/provenance
# which happens at release time.

# Block on Critical Vulnerabilities (re-using supply_chain logic)
deny contains msg if {
    msg := data.supply_chain.deny[_]
    contains(msg, "Critical vulnerability")
}

# Block if SBOM is missing
deny contains msg if {
    msg := data.supply_chain.deny[_]
    contains(msg, "Software Bill of Materials")
}

# Block on Malicious Packages
deny contains msg if {
    msg := data.supply_chain.deny[_]
    contains(msg, "Malicious package")
}

# Block on Prohibited Licenses
deny contains msg if {
    msg := data.supply_chain.deny[_]
    contains(msg, "prohibited license")
}

# Enforce Agent Permission Tiers
deny contains msg if {
    msg := data.ci_agent_gate.deny[_]
}

# Warn on High Vulnerabilities (non-blocking, but visible)
warn contains msg if {
    msg := data.supply_chain.warn[_]
}
