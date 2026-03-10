# Baseline Report: Security and CI

## 1. SBOM Status
- Currently missing from standard releases and Golden Path workflows.
- Some references exist to `syft`, `anchore`, and `@cyclonedx/cyclonedx-npm` across various `.yml` files, but it is not uniformly enforced or consistently attached to all final release artifacts.

## 2. Policy Hashing and Governance Identity
- Policy hash logging is mostly absent/UNKNOWN.
- No deterministic checks ensure that configured policies align with expected governance hash values.

## 3. Secrets Scanning
- Implemented partially in a few places via `gitleaks`, but needs repo-wide enforcement and hard-fail on detection on PRs, main, and release branches.

## 4. Golden Path Supply Chain
- `golden-path-supply-chain.yml` contains zero jobs, or schema errors leading to it not running successfully.
- It is calling `_reusable-slsa-build.yml` which attempts to build `client` and `server` Dockerfiles.

## 5. Vulnerability Scanning
- Mentioned in `.github/workflows/sbom-scan.yml` via `grype` but needs to be standardized into a zero-budget blocker for GA releases.
