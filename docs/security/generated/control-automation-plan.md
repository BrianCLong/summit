# Control Automation Plan

Generated: 2025-12-27
Source: docs/security/control-implementations.json

Each control below is derived directly from threat mitigation strategies and can be executed by CI/ops runbooks.

## SC-1 — Supply chain dependency integrity

- **Threat Model:** [docs/security/threat-models/supply-chain-insider-third-party.md](docs/security/threat-models/supply-chain-insider-third-party.md)
- **Mitigation:** Pin dependencies, verify lockfiles, and require SLSA provenance for builds
- **Owner:** Security
- **Automation:**

  - `pnpm audit --prod`
  - `npm audit --audit-level=high || true`
  - `cosign verify-blob --key cosign.pub`
  - `scripts/security/check-threat-model-coverage.ts --strict`

- **Evidence Sources:**

  - sbom-mc-v0.4.5.json
  - SECURITY/sbom-process.md

## TP-1 — Third-party connector scope enforcement

- **Threat Model:** [docs/security/threat-models/supply-chain-insider-third-party.md](docs/security/threat-models/supply-chain-insider-third-party.md)
- **Mitigation:** Limit vendor tokens to least privilege, validate ingress, and track vendor attestations
- **Owner:** Platform Governance
- **Automation:**

  - `scripts/security/enforce-threat-model-design.ts --base-ref main`
  - `pnpm --filter connector-registry lint`
  - `npx ts-node scripts/security/check-threat-model-coverage.ts --format markdown`

- **Evidence Sources:**

  - docs/security/THREAT_MODEL_INDEX.md
  - audit/ga-evidence/security/threat-model-v1.0.md

## IN-1 — Insider privileged action controls

- **Threat Model:** [docs/security/threat-models/supply-chain-insider-third-party.md](docs/security/threat-models/supply-chain-insider-third-party.md)
- **Mitigation:** Require dual approval, signed releases, and immutable audit export for privileged ops
- **Owner:** Security + SRE
- **Automation:**

  - `git log --show-signature -n 5`
  - `just audit-export`
  - `npx ts-node scripts/security/generate-control-automation.ts`

- **Evidence Sources:**

  - audit/ga-evidence/ci/ci-hard-gates.yml
  - SECURITY/threat-models/MITIGATION-MAPPING.md
