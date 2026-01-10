# Effective Policy Snapshot Contract

This document defines the canonical **EffectivePolicySnapshot** used for drift detection between repository baselines and runtime configuration.

## Schema

| Field                             | Type                       | Notes                                                                |
| --------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `snapshotId`                      | `string`                   | Deterministic SHA-256 hash of the snapshot payload.                  |
| `metadata.timestamp`              | `string`                   | ISO 8601 timestamp when the snapshot was produced.                   |
| `metadata.environment`            | `string`                   | Deployment environment name (dev/staging/prod).                      |
| `metadata.tenant`                 | `string`                   | Tenant identifier, when applicable.                                  |
| `metadata.gitCommit`              | `string`                   | Git SHA if available.                                                |
| `metadata.policySchemaVersion`    | `string`                   | Snapshot schema version.                                             |
| `metadata.serviceVersion`         | `string`                   | Server build or package version.                                     |
| `metadata.sourcePrecedence`       | `string[]`                 | Ordered list of sources used (file/env/flags).                       |
| `metadata.changeActor`            | `string`                   | Actor that last changed runtime policy (`unknown` when unavailable). |
| `normalized.toolAllowlist`        | `string[]`                 | Normalized allowlist of tools/services.                              |
| `normalized.toolDenylist`         | `string[]`                 | Normalized denylist.                                                 |
| `normalized.budgets`              | `Record<string, number>`   | Budget and rate-limit ceilings.                                      |
| `normalized.strictAttribution`    | `boolean`                  | Whether attribution/traceability is enforced.                        |
| `normalized.approvalRequirements` | `Record<string, string[]>` | Required approvers per tool/category.                                |
| `normalized.riskWeights`          | `Record<string, number>`   | Risk weighting per tool/category.                                    |
| `normalized.redaction`            | `object`                   | Non-sensitive redaction settings (enabled, strategy, fields).        |

Redaction is applied to sensitive strings before snapshots are returned to administrators or stored in alerts.

## Production principles

- **Deterministic**: snapshots are generated with explicit precedence across files and environment variables.
- **Defensive-only**: no mutation or automated remediation; outputs are proposal-only.
- **Redaction-first**: secrets, tokens, and credentials are masked before returning or persisting snapshots.
- **Auditable**: snapshot requests are logged through the audit system and surfaced to SOC pipelines when drift is detected.
