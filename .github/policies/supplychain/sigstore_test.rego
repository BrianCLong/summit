package supplychain.sigstore

test_allow_positive {
  allow with input as data.fixtures.positive
}

test_deny_missing_evidence {
  not allow with input as data.fixtures.negative_missing_evidence
}

test_deny_cosign_low {
  not allow with input as data.fixtures.negative_cosign_low
}

test_deny_unpinned_trust {
  not allow with input as data.fixtures.negative_unpinned_trust
}
