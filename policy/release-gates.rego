package release

# Default deny
default allow = false

# Allow if all gates pass
allow {
    input.train == "canary"
}

allow {
    input.train == "integration"
    input.canary_health_duration_hours >= 24
    input.integration_tests_passed
    input.has_evidence_bundle
    input.evidence.artifacts.sbom
    input.evidence.verifications.signatures.sbom
}

allow {
    input.train == "stable"
    input.release_captain_approval
    input.integration_tests_passed
    not input.blocking_issues
    input.has_evidence_bundle
    input.evidence.artifacts.sbom
    input.evidence.verifications.signatures.sbom
}

allow {
    input.train == "ga"
    input.stable_duration_weeks >= 2
    input.executive_approval
    input.security_audit_passed
    input.has_evidence_bundle
    input.evidence.artifacts.sbom
    input.evidence.verifications.signatures.sbom
}

# New Rule: Policy denies deploy if missing signature/provenance (E2.S2)
deny["Missing SBOM"] {
    not input.evidence.artifacts.sbom
}

deny["Missing SBOM Signature"] {
    not input.evidence.verifications.signatures.sbom
}
