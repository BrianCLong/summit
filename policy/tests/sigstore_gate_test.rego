package supplychain.sigstore_test

import data.supplychain.sigstore
import rego.v1

test_allow_valid_sigstore_bundle if {
  sigstore.allow with input as {
    "evidence": {"result": "pass"},
    "cosign": {"version": "3.0.4"},
    "trust": {"pinned": true}
  }
}

test_deny_failed_evidence if {
  not sigstore.allow with input as {
    "evidence": {"result": "fail"},
    "cosign": {"version": "3.0.4"},
    "trust": {"pinned": true}
  }
}

test_deny_vulnerable_cosign if {
  not sigstore.allow with input as {
    "evidence": {"result": "pass"},
    "cosign": {"version": "3.0.2"},
    "trust": {"pinned": true}
  }
}

test_deny_unpinned_trust_root if {
  not sigstore.allow with input as {
    "evidence": {"result": "pass"},
    "cosign": {"version": "3.0.4"},
    "trust": {"pinned": false}
  }
}
