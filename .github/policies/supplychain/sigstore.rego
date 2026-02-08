package supplychain.sigstore

default allow = false

enforce_version_floor(version) {
  not version_lt(version, "3.0.4")
}

allow {
  input.evidence.result == "pass"
  enforce_version_floor(input.cosign.version)
  input.trust.pinned == true
}

version_lt(left, right) {
  left_parts := semver_parts(left)
  right_parts := semver_parts(right)
  some i
  i < count(left_parts)
  i < count(right_parts)
  left_parts[i] < right_parts[i]
  all_prior_equal(left_parts, right_parts, i)
}

version_lt(left, right) {
  left_parts := semver_parts(left)
  right_parts := semver_parts(right)
  count(left_parts) < count(right_parts)
  all_prior_equal(left_parts, right_parts, count(left_parts))
  right_parts[count(left_parts)] > 0
}

semver_parts(version) = parts {
  cleaned := trim_prefix(version, "v")
  raw_parts := split(cleaned, ".")
  parts := [to_number(p) | p := raw_parts[_]]
}

all_prior_equal(left_parts, right_parts, idx) {
  not some j
  j < idx
  left_parts[j] != right_parts[j]
}
