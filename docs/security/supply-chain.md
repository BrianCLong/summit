# Supply Chain Security and Provenance

This document outlines the Summit supply-chain controls for GA-eligible builds. It covers SBOM generation, provenance, and dependency risk gating, and describes how to extend the pipeline toward SLSA Level 3 and beyond.

## Goals

- Every GA build emits verifiable artifacts: SBOMs (CycloneDX JSON) and provenance.
- Artifacts are deterministic and include the commit SHA in the filename.
- Dependency risk gate blocks builds with critical vulnerabilities and reports high/medium as warnings.

## SBOM Generation

- Tooling: internal Node script `scripts/supply-chain/supply-chain-artifacts.js` (invoked via `pnpm run supply-chain:generate`).
- Targets: server, web, and shared packages.
- Format: CycloneDX JSON.
- Location: `artifacts/sbom/` with filenames `sbom-<target>-<commit>.cdx.json`.
- Determinism: commit SHA and commit timestamp are embedded; component list is sorted for stable output.

### Usage

```bash
pnpm run supply-chain:generate
```

The command will:

1. Generate SBOMs for each target.
2. Run `pnpm audit` and record the summarized results.
3. Emit provenance at `artifacts/provenance.json` describing inputs, outputs, hashes, and dependency audit metadata.

## Provenance Model

- Inputs: commit SHA, workflow name (or `local-build`), Node version, commit timestamp.
- Outputs: SHA256 hashes of each SBOM artifact.
- Dependency audit: summary of severity counts (critical/high/moderate/low/info) and timestamp.
- Storage: `artifacts/provenance.json`.

### Validation

`pnpm run supply-chain:verify` enforces:

- SBOM present for each target.
- Provenance present, references the expected commit SHA, and hashes match the SBOM contents.
- Dependency audit summary present with **zero** critical vulnerabilities.

Failure emits human-readable reasons and exits non-zero (used by the GA gate).

## Dependency Risk Gate

- Uses `pnpm audit --json` (no external SaaS).
- Behavior: fail on any **critical** vulnerabilities; high/medium produce warnings recorded in the audit summary.
- Summary written to `artifacts/dependency-audit.json`.

## GA Gate Integration

- CI/GA workflows should call `pnpm run supply-chain:generate` after build and before publishing artifacts.
- GA verification should call `pnpm run supply-chain:verify` to enforce presence and integrity of SBOMs, provenance, and dependency audit.
- Clear failure reasons are emitted for missing artifacts, hash mismatches, absent provenance, or critical vulnerabilities.

## Path to SLSA L3+

Roadmap to harden toward full SLSA compliance:

1. **Builder Isolation**: use an isolated, reproducible builder (e.g., GitHub OIDC + hardened runners).
2. **Artifact Signing**: add Sigstore/Cosign signing of SBOMs and provenance; publish public certs.
3. **In-Toto Attestations**: emit SLSA provenance in-toto statements for each artifact with signed statements.
4. **Dependency Policies**: enforce allowlists/denylists and hash-based pinning for critical packages.
5. **Transparency & Verification**: publish SBOMs/provenance to an immutable store (WORM bucket) and verify at deploy time.

These steps can be layered onto the current scripts without changing consumer APIs.

## Troubleshooting

- Missing SBOM files: rerun `pnpm run supply-chain:generate` and ensure commit SHA is available (GITHUB_SHA or local git).
- Audit parsing errors: confirm `pnpm audit --json` runs locally; the script will report if JSON is invalid.
- Hash mismatch: delete `artifacts/` and regenerate to ensure fresh SBOMs and provenance.
