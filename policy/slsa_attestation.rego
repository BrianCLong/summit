import future.keywords
package summit.slsa

default allow := false

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

attestation_exists if {
  input.attestation
}

valid_builder if {
  att := input.attestation
  att.builder == "github-actions"
}

valid_runner if {
  att := input.attestation
  startswith(att.runner, "ubuntu")
}

valid_commit if {
  att := input.attestation
  att.commit == input.expected_commit
}

valid_signature if {
  sig := input.attestation.signature
  sig.verified == true
}

# --- DECISION ---

allow if {
  attestation_exists
  valid_builder
  valid_runner
  valid_commit
  valid_signature
}
