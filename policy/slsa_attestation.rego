package summit.slsa

default allow = false

#
# Input shape (example):
# {
#   "attestation": {
#       "builder": "github-actions",
#       "commit": "abc123",
#       "repo": "BrianCLong/summit",
#       "runner": "ubuntu-latest",
#       "inputs": {...},
#       "signature": {
#         "verified": true,
#         "signer": "github-oidc"
#       }
#   },
#   "expected_commit": "abc123"
# }
#

# --- STRUCTURAL CHECKS ---

attestation_exists {
  input.attestation
}

valid_builder {
  att := input.attestation
  att.builder == "github-actions"
}

valid_runner {
  att := input.attestation
  startswith(att.runner, "ubuntu")
}

valid_commit {
  att := input.attestation
  att.commit == input.expected_commit
}

valid_signature {
  sig := input.attestation.signature
  sig.verified == true
}

# --- DECISION ---

allow {
  attestation_exists
  valid_builder
  valid_runner
  valid_commit
  valid_signature
}
