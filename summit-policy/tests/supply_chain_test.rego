package summit.supply_chain_test

import rego.v1
import data.summit.supply_chain

test_pass if {
	mock_input := {
		"artifacts": {
			"sbom": {"path": "artifacts/sbom/spdx.json", "sha256": "abc"},
			"image": {"digest": "sha256:123", "signatures": {"cosign": true}},
			"provenance": {"slsa_level": 1, "attestation_path": "artifacts/provenance/intoto.jsonl"},
		},
	}
	v := supply_chain.verdict with input as mock_input
	v.verdict == "PASS"
}

test_fail_no_sbom if {
	mock_input := {
		"artifacts": {
			"sbom": {"path": "", "sha256": ""},
			"image": {"digest": "sha256:123", "signatures": {"cosign": true}},
			"provenance": {"slsa_level": 1, "attestation_path": "artifacts/provenance/intoto.jsonl"},
		},
	}
	v := supply_chain.verdict with input as mock_input
	v.verdict == "FAIL"
	v.reasons["SBOM missing"]
}

test_fail_no_signature if {
	mock_input := {
		"artifacts": {
			"sbom": {"path": "artifacts/sbom/spdx.json", "sha256": "abc"},
			"image": {"digest": "sha256:123", "signatures": {"cosign": false}},
			"provenance": {"slsa_level": 1, "attestation_path": "artifacts/provenance/intoto.jsonl"},
		},
	}
	v := supply_chain.verdict with input as mock_input
	v.verdict == "FAIL"
	v.reasons["cosign signature missing"]
}
