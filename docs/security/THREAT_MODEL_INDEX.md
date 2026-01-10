# Threat Model Index

> **Last Updated**: 2025-12-27
> **Owner**: Security Team

This index tracks all feature-level threat models in the IntelGraph/Summit platform.

## Overview

| Total Models | Critical | High | Medium | Low |
| ------------ | -------- | ---- | ------ | --- |
| 4            | 3        | 1    | 0      | 0   |

## Threat Models

| Feature                                        | Risk Tier | Link                                                                                       | Last Updated | Owner            | Status   |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ | ------------ | ---------------- | -------- |
| Authentication & Authorization                 | Critical  | [auth.md](./threat-models/auth.md)                                                         | 2025-12-06   | Security Team    | Approved |
| IntelGraph Queries                             | High      | [intelgraph-queries.md](./threat-models/intelgraph-queries.md)                             | 2025-12-06   | Graph Team       | Approved |
| Maestro AI Orchestration                       | Critical  | [maestro-runs.md](./threat-models/maestro-runs.md)                                         | 2025-12-06   | AI Platform Team | Approved |
| Supply Chain, Insider, & Third-Party Assurance | Critical  | [supply-chain-insider-third-party.md](./threat-models/supply-chain-insider-third-party.md) | 2025-12-27   | Security Team    | Approved |

## Coverage Map

This table maps code paths to their required threat models for CI enforcement.

| Path Pattern                                                           | Feature                    | Threat Model                                                                               | Risk Tier |
| ---------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ | --------- |
| `server/src/auth/**`                                                   | Authentication             | [auth.md](./threat-models/auth.md)                                                         | Critical  |
| `server/src/conductor/auth/**`                                         | JWT/RBAC                   | [auth.md](./threat-models/auth.md)                                                         | Critical  |
| `services/common/auth/**`                                              | WebAuthn/Step-up           | [auth.md](./threat-models/auth.md)                                                         | Critical  |
| `SECURITY/policy/opa/**`                                               | Authorization Policies     | [auth.md](./threat-models/auth.md)                                                         | Critical  |
| `server/src/graphql/intelgraph/**`                                     | Graph Queries              | [intelgraph-queries.md](./threat-models/intelgraph-queries.md)                             | High      |
| `server/src/intelgraph/**`                                             | Graph Client               | [intelgraph-queries.md](./threat-models/intelgraph-queries.md)                             | High      |
| `server/src/maestro/**`                                                | AI Orchestration           | [maestro-runs.md](./threat-models/maestro-runs.md)                                         | Critical  |
| `services/copilot/**`                                                  | AI Copilot                 | [maestro-runs.md](./threat-models/maestro-runs.md)                                         | Critical  |
| `src/maestro/**`                                                       | Maestro Versions           | [maestro-runs.md](./threat-models/maestro-runs.md)                                         | Critical  |
| `conductor-ui/frontend/src/maestro/**`                                 | Maestro UI                 | [maestro-runs.md](./threat-models/maestro-runs.md)                                         | Critical  |
| `**/package.json`, `**/pnpm-lock.yaml`, `**/Cargo.{toml,lock}`         | Dependency Supply Chain    | [supply-chain-insider-third-party.md](./threat-models/supply-chain-insider-third-party.md) | Critical  |
| `Dockerfile*`, `docker/**`, `.github/workflows/**`                     | Build & Artifact Integrity | [supply-chain-insider-third-party.md](./threat-models/supply-chain-insider-third-party.md) | Critical  |
| `services/**/connector/**`, `adapters/**`, `packages/**/connector*/**` | Third-Party Connectors     | [supply-chain-insider-third-party.md](./threat-models/supply-chain-insider-third-party.md) | High      |

## Pending Models

Features that need threat models but don't have them yet:

| Feature                  | Risk Tier | Owner          | Target Date | Ticket |
| ------------------------ | --------- | -------------- | ----------- | ------ |
| Data Ingestion Pipelines | High      | Data Team      | TBD         | -      |
| Plugin System            | High      | Platform Team  | TBD         | -      |
| Report Export            | Medium    | Analytics Team | TBD         | -      |
| WebSocket Subscriptions  | Medium    | Platform Team  | TBD         | -      |

## Staleness Report

Models approaching or past their review dates:

| Feature                              | Last Updated | Review Due | Days Until Due | Status  |
| ------------------------------------ | ------------ | ---------- | -------------- | ------- |
| Authentication                       | 2025-12-06   | 2026-01-05 | 30             | Current |
| IntelGraph Queries                   | 2025-12-06   | 2026-02-04 | 60             | Current |
| Maestro AI                           | 2025-12-06   | 2026-01-05 | 30             | Current |
| Supply Chain & Third-Party Assurance | 2025-12-27   | 2026-01-26 | 30             | Current |

## Quick Links

- [OWASP Agentic Top 10](./OWASP_AGENTIC_TOP_10.md) (**New Standard**)
- [Threat Modeling Framework](./threat-modeling-framework.md)
- [Template](./threat-models/template.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)
- [Existing System Threat Model](../../SECURITY/threat-model.md)

## How to Add a New Threat Model

1. Copy the template:

   ```bash
   cp docs/security/threat-models/template.md docs/security/threat-models/[feature].md
   ```

2. Fill in all required sections

3. Get security review and approval

4. Add entry to this index:
   - Add row to "Threat Models" table
   - Add path mappings to "Coverage Map" table
   - Remove from "Pending Models" if applicable

5. Commit with message: `sec(threat-model): add [feature] threat model`

## Maintenance

- **Weekly**: Security team reviews staleness report
- **Monthly**: Update pending models list
- **Quarterly**: Comprehensive review of all models
- **On-demand**: Update when features change significantly

---

**Next Review**: 2026-01-06
