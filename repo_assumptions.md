# Repo Assumptions & Reality Check

## Verified (2026-02-04)
- **Sigstore/Cosign usage**: GitHub Actions workflows and internal scripts install and use cosign.
  - Workflows reference `sigstore/cosign-installer` in `.github/workflows/supply-chain-integrity.yml`, `.github/workflows/supply-chain-attest.yml`, `.github/workflows/supplychain-verify.yml`, `.github/workflows/release-ga.yml`, and others.
  - Scripts include `scripts/supply-chain/sign-and-attest.sh`, `scripts/release/attest_ga_evidence.sh`, `scripts/release/sign_governance_lockfile.sh`, and `scripts/security/verify-slsa-l3.sh`.
- **Go tooling presence**: `go.mod`/`go.sum` files exist in the repo (multiple Go utilities), indicating potential sigstore Go dependencies in Go modules.
- **Python tooling presence**: Python lockfiles and requirements files exist (`requirements.in`, assorted `requirements*.txt`, `pyproject.toml`), indicating potential sigstore-python dependencies.
- **CI gate candidates**: Supply chain verification workflows exist under `.github/workflows/` including `supply-chain-integrity.yml` and `supplychain-verify.yml`.

## Assumed (pending deeper audit)
- **Image build/push flow**: Container build/push is orchestrated in GitHub Actions plus scripts under `scripts/` (e.g., `scripts/build-push.sh`), but exact image names/digests used for verification need a focused audit per workflow.
- **Legacy TUF client usage**: No direct usage confirmed yet; if sigstore Go libraries are used in Go utilities, guardrails must ensure `SIGSTORE_NO_CACHE=true` when legacy TUF paths are present.

## Must-Not-Touch (until verified)
- Production deploy workflows
- Secret injection patterns
- Cluster manifests applied to production
