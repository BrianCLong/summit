package supplychain

import rego.v1

default allow := false

allow if {
	input.evidence.result == "pass"
	semver.compare(input.cosign.version, "3.0.5") >= 0
	input.trust.pinned == true
	input.rekor.tlog_verified == true
	input.attestations.provenance.slsa_verified == true
	input.attestations.sbom.spdx_complete == true
	input.attestations.sbom.cyclonedx_complete == true
}
