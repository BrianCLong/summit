# Radical Documentation Transparency Program

This program operationalizes public-first documentation for the Summit/IntelGraph platform. It establishes mandatory publication surfaces, live artifacts, and automation that keep the external record synchronized with the deployed system.

## Objectives

- Publish public RFCs and governance philosophy so roadmap intent and trade-offs are reviewable.
- Maintain API change logs and a non-capabilities register to set clear expectations for integrators and auditors.
- Keep live diagrams (architecture, data flows, trust boundaries) auto-generated from the codebase to prevent drift.

## Publication Surfaces

| Surface               | Location                                   | Cadence                                | Owner              | Notes                                                                  |
| --------------------- | ------------------------------------------ | -------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| Public RFCs           | `docs/rfcs/` (mirrored to public portal)   | Weekly intake; monthly stable snapshot | Architecture Guild | Use RFC template; publish design decisions + impact matrix.            |
| Governance whitepaper | `docs/whitepaper/governance-philosophy.md` | Quarterly refresh                      | Governance Council | Includes decision rights, escalation, and auditability guarantees.     |
| API change log        | `docs/API_CHANGE_LOG.md`                   | With every shipped API change          | API DRI            | Mirrors semver and deprecation windows; links to GraphQL schema diffs. |
| Non-capabilities list | `docs/transparency/non-capabilities.md`    | Monthly or on new limitation           | Risk & Safety      | Must be versioned and externally accessible.                           |
| Live diagrams         | `docs/generated/architecture/`             | On merge to `main` (CI)                | Platform Eng       | Generated from `ARCHITECTURE_MAP.generated.yaml` and repo manifests.   |

## Operating Model

1. **Source-of-truth inputs**: `ARCHITECTURE_MAP.generated.yaml`, `pnpm-workspace.yaml`, package manifests, and GraphQL schema files.
2. **Automation**: CI job `docs-transparency` runs on every merge to `main` and regenerates diagrams + publishes updated API change log excerpts to the public portal.
3. **Review**: Documentation changes follow the same review rigor as code (CODEOWNERS required). No doc merges without validated generation step output.
4. **Drift control**: If generation fails or detected drift between code and published artifacts, block the pipeline and open an incident ticket tagged `docs-drift`.

## Live Diagrams (auto-generated)

- **Architecture topology**: Rendered from `ARCHITECTURE_MAP.generated.yaml` into Mermaid (`docs/generated/architecture/topology.mmd`) and PNG/SVG for portals.
- **Data flows**: Derived from service dependencies declared in `ARCHITECTURE_MAP.generated.yaml` and package manifests; published to `docs/generated/architecture/data-flows.mmd`.
- **Trust boundaries**: Built from `SECURITY/BOUNDARIES.yaml` and service ingress/egress rules; exported to `docs/generated/architecture/trust-boundaries.mmd`.
- **Execution**: CI step runs `tools/rqb/generate_architecture_maps.ts` (existing generator) followed by `pnpm run docs:diagrams` to refresh artifacts. Outputs are committed as part of the release PR.

## API Change Log Expectations

- Every API-affecting PR must add an entry to `docs/API_CHANGE_LOG.md` with: scope, version, change type, migration notes, and deprecation/removal dates.
- GraphQL schema diffs are generated via `pnpm run api:schema:diff` and linked from the change log entry.
- CI enforces presence of a change-log entry when GraphQL schema or REST OpenAPI files change.

## Non-Capabilities Register (initial set)

- No customer-data training of foundation models without explicit opt-in and signed DPA.
- No autonomous infrastructure mutations; all changes require human-approved plans.
- No unsecured outbound data egress to non-approved domains or regions.
- No probabilistic identity resolution in regulated tenants (must use deterministic matching only).
- No offline access token generation; tokens require live issuance flows.

## Publishing & Governance

- **Release branch gates**: Docs generation and change-log update must be green before release tags are cut.
- **Telemetry**: Success/failure metrics for documentation jobs are exported to the Observability stack under `transparency.*`.
- **Audit**: Quarterly audit samples RFC publication, whitepaper currency, API change-log completeness, and non-capabilities updates.
- **Escalation**: Drift or missing artifacts trigger `security-council` notification and create a Sev-2 doc incident.

## Forward-Looking Enhancements

- Integrate runtime traces to auto-highlight hot paths in data-flow diagrams.
- Add signed SBOM links to each API change-log entry for downstream risk review.
- Provide a public RSS feed for RFCs and change-log updates for ecosystem subscribers.
