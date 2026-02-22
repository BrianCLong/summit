package release_gates
import future.keywords.if

default allow = false

# Allow release if all gates pass
allow {
    input.sbom_present
    input.signature_present
    not input.vulnerabilities_critical
}

# Deny if SBOM is missing
deny["Missing SBOM"] {
    not input.sbom_present
}

# Deny if signature is missing
deny["Missing Signature"] {
    not input.signature_present
}

# Deny if critical vulnerabilities exist
deny["Critical Vulnerabilities Detected"] {
    input.vulnerabilities_critical
}
