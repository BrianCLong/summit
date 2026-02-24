import future.keywords
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
