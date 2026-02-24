package sigstore

# Starter policy for Sigstore policy-controller.
# Replace placeholders with your repo/workflow identity.

default allow = false

allow {
  some sig in input.signatures
  sig.certificate.issuer == "https://token.actions.githubusercontent.com"
  sig.certificate.subject == "https://github.com/ORG/REPO/.github/workflows/pr-provenance-sbom.yml@refs/heads/main"

  some att in input.attestations
  att.predicateType == "https://spdx.dev/Document"
}
