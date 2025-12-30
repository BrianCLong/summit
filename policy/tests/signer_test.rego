package policy.signer.test

import data.policy.signer
import future.keywords.if

valid_input := {
  "subject": "policy-bundle",
  "digest": "b1946ac92492d2347c6235b4d2611184",
  "signature": {
    "signerId": "mc-platform-signer",
    "keyVersion": "v3",
    "algorithm": "ed25519"
  },
  "now": "2025-02-12T11:00:00Z",
  "expiry": "2025-02-13T11:00:00Z"
}

expired_input := {
  "subject": "policy-bundle",
  "digest": "b1946ac92492d2347c6235b4d2611184",
  "signature": {
    "signerId": "mc-platform-signer",
    "keyVersion": "v3",
    "algorithm": "ed25519"
  },
  "now": "2025-02-12T11:00:00Z",
  "expiry": "2025-02-01T00:00:00Z"
}

unsupported_algo_input := {
  "subject": "policy-bundle",
  "digest": "b1946ac92492d2347c6235b4d2611184",
  "signature": {
    "signerId": "mc-platform-signer",
    "keyVersion": "v3",
    "algorithm": "rsa-1024"
  },
  "now": "2025-02-12T11:00:00Z",
  "expiry": "2025-02-13T11:00:00Z"
}

test_allow_valid_envelope if {
  signer.allow with input as valid_input
}

test_reject_expired_envelope if {
  not signer.allow with input as expired_input
  "attestation expired" in signer.reasons with input as expired_input
}

test_reject_unsupported_algorithm if {
  not signer.allow with input as unsupported_algo_input
  signer.reasons[_] == "unsupported algorithm: rsa-1024" with input as unsupported_algo_input
}
