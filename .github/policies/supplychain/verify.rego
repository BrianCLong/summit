package supplychain

import rego.v1

default allow := false

allow if {
	input.evidence.result == "pass"
	semver.compare(input.cosign.version, "3.0.4") >= 0
	input.trust.pinned == true
}
