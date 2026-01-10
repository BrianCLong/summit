package dockerfile

import rego.v1

# Test cases for dockerfile policy

test_deny_root_user if {
	# Test that root user is denied
	test_input := {
		"Stage": [{
			"Commands": [{
				"Cmd": "user",
				"Value": ["root"]
			}]
		}]
	}

	denials := deny with input as test_input
	count(denials) > 0
}

test_allow_non_root_user if {
	# Test that non-root user is allowed
	test_input := {
		"Stage": [{
			"Commands": [{
				"Cmd": "user",
				"Value": ["appuser"]
			}]
		}]
	}

	# Should not have deny rules triggered
	denials := deny with input as test_input
	count([d | d := denials[_]; contains(d, "root")]) == 0
}

test_deny_latest_tag if {
	# Test that latest tag is denied
	test_input := {
		"Stage": [{
			"Commands": [{
				"Cmd": "from",
				"Value": ["node:latest"]
			}]
		}]
	}

	denials := deny with input as test_input
	violations := [d | d := denials[_]; contains(d, "latest")]
	count(violations) > 0
}

test_allow_specific_tag if {
	# Test that specific version tags are allowed
	test_input := {
		"Stage": [{
			"Commands": [{
				"Cmd": "from",
				"Value": ["node:18.17.0-alpine"]
			}]
		}]
	}

	# Should not trigger latest tag violation
	denials := deny with input as test_input
	violations := [d | d := denials[_]; contains(d, "latest")]
	count(violations) == 0
}

test_require_approved_registry if {
	# Test that unapproved registries are denied
	test_input := {
		"Stage": [{
			"Commands": [{
				"Cmd": "from",
				"Value": ["malicious-registry.com/image:v1.0.0"]
			}]
		}]
	}

	denials := deny with input as test_input
	violations := [d | d := denials[_]; contains(d, "approved registry")]
	count(violations) > 0
}

test_warn_missing_healthcheck if {
	# Test that missing healthcheck generates warning
	test_input := {
		"Stage": [{
			"Commands": [{
				"Cmd": "from",
				"Value": ["node:18.17.0"]
			}]
		}]
	}

	warns := warn with input as test_input
	warnings := [w | w := warns[_]; contains(w, "HEALTHCHECK")]
	count(warnings) > 0
}

test_allow_with_healthcheck if {
	# Test that healthcheck instruction satisfies requirement
	test_input := {
		"Stage": [{
			"Commands": [
				{
					"Cmd": "from",
					"Value": ["node:18.17.0"]
				},
				{
					"Cmd": "healthcheck",
					"Value": ["--interval=30s", "CMD", "curl", "-f", "http://localhost/health"]
				}
			]
		}]
	}

	# Should not generate healthcheck warning
	warns := warn with input as test_input
	warnings := [w | w := warns[_]; contains(w, "HEALTHCHECK")]
	count(warnings) == 0
}
