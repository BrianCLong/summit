package ci.gates.webauthn

default allow = false

# inputs: { "sensitive_endpoints": 120, "protected_endpoints": 120 }
coverage := input.protected_endpoints / input.sensitive_endpoints

allow {
  coverage >= 0.99
}

