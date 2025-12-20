package policy.signer

# Allow attestation envelopes that were signed by trusted algorithms and are not expired.
default allow = false

trusted_algorithms := {"ed25519", "ecdsa-p256"}

allow {
  input.subject
  input.signature.signerId
  input.signature.keyVersion
  input.signature.algorithm
  trusted_algorithms[input.signature.algorithm]
  valid_digest
  not expired
}

# Digest must look like a hex-encoded SHA-256 value (32 or 64 characters)
valid_digest {
  digest := input.digest
  count(digest) >= 32
  count(digest) <= 128
}

expired {
  input.expiry
  input.now
  expires := time.parse_rfc3339_ns(input.expiry)
  now := time.parse_rfc3339_ns(input.now)
  expires <= now
}

reasons[r] {
  not allow
  not input.signature
  r := "missing signature"
}

reasons[r] {
  not allow
  input.signature
  not trusted_algorithms[input.signature.algorithm]
  r := sprintf("unsupported algorithm: %v", [input.signature.algorithm])
}

reasons[r] {
  not allow
  expired
  r := "attestation expired"
}
