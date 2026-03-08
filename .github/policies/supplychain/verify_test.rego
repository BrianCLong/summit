package supplychain

import rego.v1

test_allow_pass if {
	allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_cve if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.4"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_result if {
	not allow with input as {
		"evidence": {"result": "fail"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_unpinned if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": false},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_missing_rekor_tlog if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": false},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_missing_slsa if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": false},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_missing_spdx if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": false,
				"cyclonedx_complete": true
			}
		}
	}
}

test_allow_fail_missing_cyclonedx if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.5"},
		"trust": {"pinned": true},
		"rekor": {"tlog_verified": true},
		"attestations": {
			"provenance": {"slsa_verified": true},
			"sbom": {
				"spdx_complete": true,
				"cyclonedx_complete": false
			}
		}
	}
}
