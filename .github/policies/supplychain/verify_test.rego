package supplychain

import rego.v1

test_allow_pass if {
	allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.4"},
		"trust": {"pinned": true}
	}
}

test_allow_fail_cve if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.2"},
		"trust": {"pinned": true}
	}
}

test_allow_fail_result if {
	not allow with input as {
		"evidence": {"result": "fail"},
		"cosign": {"version": "3.0.4"},
		"trust": {"pinned": true}
	}
}

test_allow_fail_unpinned if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.4"},
		"trust": {"pinned": false}
	}
}

test_allow_fail_cve_3_0_3 if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "3.0.3"},
		"trust": {"pinned": true}
	}
}

test_allow_fail_cve_2_6_1 if {
	not allow with input as {
		"evidence": {"result": "pass"},
		"cosign": {"version": "2.6.1"},
		"trust": {"pinned": true}
	}
}
