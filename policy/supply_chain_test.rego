package supply_chain

import rego.v1

test_deny_missing_artifacts if {
	# Input missing required artifacts
	inp := {"artifact": {}}
	msgs := deny with input as inp
	"Artifact must include SPDX SBOM" in msgs
	"Artifact must include CycloneDX SBOM" in msgs
	"Artifact must include Build Provenance Attestation" in msgs
}

test_deny_missing_artifact_object if {
	# Input completely missing artifact object
	inp := {}
	msgs := deny with input as inp
	"Artifact must include SPDX SBOM" in msgs
	"Artifact must include CycloneDX SBOM" in msgs
	"Artifact must include Build Provenance Attestation" in msgs
}

test_allow_complete_artifacts if {
	# Input with all required artifacts
	inp := {
		"artifact": {
			"sbom_spdx": {},
			"sbom_cyclonedx": {},
			"provenance_attestation": {}
		},
		"slsa_provenance": {
			"predicate": {
				"buildType": "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
				"builder": {"id": "https://github.com/actions/runner"},
				"metadata": {"buildInvocationId": "123"}
			}
		},
		"vulnerability_scan": {},
		"transparency_log": {"uuid": "123"},
		"evidence_bundle": {}
	}

	msgs := deny with input as inp
	not "Artifact must include SPDX SBOM" in msgs
	not "Artifact must include CycloneDX SBOM" in msgs
	not "Artifact must include Build Provenance Attestation" in msgs
}

test_sovereign_allow if {
	deny == set()
	with input as {
		"sboms_signed": true,
		"provenance_signed": true,
		"type": "container_image",
		"artifact": {
			"sbom_spdx": true,
			"sbom_cyclonedx": true,
			"provenance_attestation": true
		},
		"slsa_provenance": {
			"predicate": {
				"buildType": "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
				"builder": { "id": "https://github.com/actions/runner" },
				"metadata": { "buildInvocationId": "https://github.com/summit/run/123" }
			}
		},
		"sbom": { "spdxVersion": "SPDX-2.3", "packages": [{"name": "p1"}, {"name": "p2"}, {"name": "p3"}, {"name": "p4"}, {"name": "p5"}, {"name": "p6"}, {"name": "p7"}, {"name": "p8"}, {"name": "p9"}, {"name": "p10"}] },
		"vulnerability_scan": { "vulnerabilities": [] },
		"signature": { "format": "cosign", "certificate": { "oidc_issuer": "https://token.actions.githubusercontent.com" } },
		"transparency_log": { "uuid": "abc-123" },
		"artifacts": [{ "name": "art1", "sha256": "h1", "sbom_spdx": true, "sbom_cyclonedx": true, "provenance_attestation": true, "signature_verification_passed": true }],
		"evidence_bundle": { "slsa_provenance": true, "sbom": true, "vulnerability_scan": true, "signature": true, "transparency_log": true },
		"operation": {
			"isSovereign": true,
			"affected_jurisdictions": ["US"]
		},
		"verification": {
			"independent_sources": [
				{ "entity": "source1", "signature_valid": true },
				{ "entity": "source2", "signature_valid": true }
			]
		},
		"containment": {
			"emergency_stop": { "available": true },
			"rollback": { "prepared": true },
			"human_override": { "enabled": true }
		},
		"compliance": {
			"jurisdictions": { "US": { "status": "COMPLIANT" } }
		},
		"autonomy": {
			"reversibility": { "guaranteed": true },
			"human_control": { "intervention_available": true }
		}
	}
}

test_sovereign_deny_insufficient_verification if {
	deny["Sovereign operation requires independent verification from at least 2 sources"]
	with input as {
		"operation": { "isSovereign": true },
		"verification": {
			"independent_sources": [
				{ "entity": "source1", "signature_valid": true }
			]
		}
	}
}

test_sovereign_deny_containment if {
	deny["Sovereign operation requires verified containment readiness (Emergency Stop + Rollback)"]
	with input as {
		"operation": { "isSovereign": true },
		"verification": {
			"independent_sources": [
				{ "entity": "source1", "signature_valid": true },
				{ "entity": "source2", "signature_valid": true }
			]
		},
		"containment": {
			"emergency_stop": { "available": false },
			"rollback": { "prepared": true },
			"human_override": { "enabled": true }
		}
	}
}
