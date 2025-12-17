package ci_gate

import data.supply_chain

# CI Gate Policy
# Enforces security requirements for Pull Requests and Pre-Merge builds
# This is a subset of the full supply chain policy, excluding signing/provenance
# which happens at release time.

# Block on Critical Vulnerabilities (re-using supply_chain logic)
deny[msg] {
    msg := data.supply_chain.deny[_]
    contains(msg, "Critical vulnerability")
}

# Block if SBOM is missing
deny[msg] {
    msg := data.supply_chain.deny[_]
    contains(msg, "Software Bill of Materials")
}

# Block on Malicious Packages
deny[msg] {
    msg := data.supply_chain.deny[_]
    contains(msg, "Malicious package")
}

# Block on Prohibited Licenses
deny[msg] {
    msg := data.supply_chain.deny[_]
    contains(msg, "prohibited license")
}

# Warn on High Vulnerabilities (non-blocking, but visible)
warn[msg] {
    msg := data.supply_chain.warn[_]
}
