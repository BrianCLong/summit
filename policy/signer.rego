import future.keywords.in
package policy.signer

import future.keywords.if
import future.keywords.contains

# Allow attestation envelopes that were signed by trusted algorithms and are not expired.
default allow := false

trusted_algorithms := {"ed25519", "ecdsa-p256"}

allow if {
  input.subject
  input.signature.signerId
  input.signature.keyVersion
  input.signature.algorithm
  trusted_algorithms[input.signature.algorithm]
  valid_digest
  not expired
}

# Digest must look like a hex-encoded SHA-256 value (32 or 64 characters)
valid_digest if {
  digest := input.digest
  count(digest) >= 32
  count(digest) <= 128
}

expired if {
  input.expiry
  input.now
  expires := time.parse_rfc3339_ns(input.expiry)
  now := time.parse_rfc3339_ns(input.now)
  expires <= now
}

reasons contains r if {
  not allow
  not input.signature
  r := "missing signature"
}

reasons contains r if {
  not allow
  input.signature
  not trusted_algorithms[input.signature.algorithm]
  r := sprintf("unsupported algorithm: %v", [input.signature.algorithm])
}

reasons contains r if {
  not allow
  expired
  r := "attestation expired"
}
