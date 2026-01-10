# Counter-Intel OSINT Playbook

This playbook standardizes passive collection of organization, agent, and repository intelligence using Maltego/SpiderFoot-style graph exploration. It is tuned for detecting leaked metadata, exposed access keys, and package supply-chain risks while staying within legal, non-intrusive reconnaissance boundaries.

## Goals

- Establish reproducible, auditable OSINT collection against public surfaces (source code hosts, artifact registries, package manifests).
- Normalize findings into risk-ranked outputs that can be triaged quickly.
- Provide closure guidance that maps directly to safety invariants **GC-01**, **AA-02**, and **SI-01** with verification commands.

## Tooling Overview

- **Scripts:** `scripts/osint/passive_recon.py` orchestrates passive data pulls from repository metadata, artifact registries, and package manifests.
- **Inputs:** Organization name, list of repositories, package coordinates (npm/pypi/crates), container images, and optional corporate email domains for maintainer checks.
- **Outputs:** JSON findings file with severity, category, evidence URLs, and remediation hints.

## Collection Runbooks

### 1) Discover Leaked Metadata (repos, agents, deployment hints)

1. Enumerate targets:
   ```bash
   python scripts/osint/passive_recon.py \
     --org summit-intel \
     --repos summit/intelgraph,acme/internal-services \
     --output artifacts/osint/metadata-findings.json
   ```
2. Review `categories=metadata-leak` findings for:
   - Internal identifiers in descriptions/topics ("internal", "confidential", project codenames).
   - Branch defaulting to `main` without protection metadata.
   - Public forks of previously private repositories.
3. Pivot to agent exposure:
   - Check commit author domains surfaced in `signals` for non-corporate email domains.
   - Flag automation accounts without 2FA references (risk scoring >50).

### 2) Identify Exposed Access Keys

1. Target repo manifests and release assets (package.json, pyproject.toml, requirements.txt, Cargo.toml, go.mod by default):
   ```bash
   python scripts/osint/passive_recon.py \
     --repos summit/secrets-handler \
     --deep-manifest true \
     --output artifacts/osint/access-key-findings.json
   ```
2. Inspect `categories=secret-leak` entries:
   - GitHub Actions secrets referenced in README or workflow badge URLs.
   - AWS/GCP-style key fingerprints in commit messages or tags.
   - Publicly downloadable SBOMs or artifacts containing credential-like strings.
3. Validate exposure paths via browser-only retrieval (no authenticated cloning) to remain passive.

### 3) Package Supply-Chain Intelligence

1. Sweep package registries:
   ```bash
   python scripts/osint/passive_recon.py \
     --packages npm:@org/agent-kit,pypi:intel-graph,crate:intelgraph-core \
     --corp-domain summit-intel.ai \
     --output artifacts/osint/supply-chain-findings.json
   ```
2. Triage `categories=supply-chain`:
   - Maintainer email mismatch with corporate domain.
   - Recent ownership/maintainer churn (detected via release cadence deltas).
   - Unsigned container images or missing provenance attestations.
3. Correlate with dependency manifests:
   ```bash
   python scripts/osint/passive_recon.py \
     --repos summit/intelgraph \
     --packages npm:@org/agent-kit \
     --corp-domain summit-intel.ai \
     --output artifacts/osint/manifest-correlation.json
   ```

## Findings Interpretation

- **Severity scoring:** 0-100 scale derived from signal weights (secret patterns, maintainer trust, age of last release, public fork count). Scores ≥70 demand immediate containment.
- **Evidence:** Each finding lists `source`, `evidence_url`, and `signal` string for analyst review.
- **Auditability:** Outputs are deterministic given the same inputs; append `--save-raw` to retain raw API payloads for chain-of-custody.
- **Customization:** Use `--corp-domain` to tune maintainer checks and `--manifest-path` to scan additional manifest files beyond the defaults.

## Closure & Hardening (Mapped to Safety Invariants)

| Invariant                              | Closure Action                                                                                                               | Verification Command                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **GC-01 (Governance & Configuration)** | Enable strict branch protection, disable GitHub Actions for public forks, enforce CODEOWNERS on sensitive repos.             | `./scripts/verify-repo-hardening.sh --repos summit/intelgraph`                                                                   |
| **AA-02 (Access & Authentication)**    | Rotate automation tokens, enforce SSO+2FA for all contributors, move secrets to vault-backed CI variables.                   | `./scripts/security/validate-access-controls.sh --org summit-intel`                                                              |
| **SI-01 (Supply-Chain Integrity)**     | Require signed artifacts (Sigstore/Cosign), pin dependencies with checksums, validate SBOM provenance for released packages. | `./scripts/sbom/sbom-attest.sh --repo summit/intelgraph && ./scripts/supply_chain/check-provenance.sh --packages @org/agent-kit` |

After remediation, rerun the relevant `passive_recon.py` scans and ensure no findings remain above severity 20.

## Reporting & Escalation

- Store findings under `artifacts/osint/` with timestamped filenames.
- File tickets tagged `security-osint` for any severity ≥50; include evidence URLs and recommended mitigations.
- Escalate to `security-council` if exposed keys or unsigned release artifacts are detected.
