# Security & CI/CD Hardening Roadmap

## Mission
Drive Summit to a verifiably hardened, SOC2‑seed posture with zero known critical vulnerabilities, strong supply‑chain guarantees, and regression‑resistant CI. Go beyond fixing known issues: discover, quantify, and eliminate latent security risk.

## Phase 1: Establish Ground Truth
- Inventory security/compliance/CI governance issues.
- Baseline current workflow gaps (SBOMs, Policy hashes, CI failures like Golden Path).

## Phase 2: Supply Chain, SBOM, and Provenance
- Implement SBOM generation per image/build artifact.
- Fix Golden Path workflow failures.
- Implement zero-budget for critical vulns for build artifacts.

## Phase 3: Compliance Automation, Audit, and Governance
- Generate unified audit bundle.
- Hash policy bundles and log hash values per run.
- Emit compliance summary artifacts per CI run.

## Phase 4: Secrets, Access Control, and Determinism
- Add repo-wide secrets scanning in CI.
- Tighten GitHub actions permissions (least-privilege, OIDC).
- Implement CI Reproducibility gate.

## Phase 5: CI Hardening and Regression-Proofing
- Fix structural CI issues (missing `pnpm`, Golden Path schema).
- SAST, lockfile checks, dependency reviews.
- Update Release Ops SLO reporting.
