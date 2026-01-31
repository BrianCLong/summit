Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Agent Permission Tiers

This document defines the **Canonical Permission Tiers** for all automated agents, coding assistants (Codex/Jules), and bot accounts operating within the Summit repository.

**Authority**: This standard is enforced by the Governance Control Plane. Violations result in automatic PR rejection and potential token revocation.

## Tier 0: Read-Only (Analyst Agents)

**Scope**: Safe, non-invasive analysis and reporting.
**Role**: `agent:tier-0`

| Allowed Paths        | Allowed Operations | Prohibited Actions                 |
| :------------------- | :----------------- | :--------------------------------- |
| `docs/`              | `read`             | No write access                    |
| `scripts/analysis/`  | `read`             | No execution of production scripts |
| `server/src/`        | `read`             | No code modification               |
| `.github/workflows/` | `read`             | No workflow triggering             |

**Artifacts**:

- Analysis Reports (posted as PR comments)
- Metrics (posted to telemetry endpoints)

## Tier 1: Documentation Only (Scribe Agents)

**Scope**: Documentation updates, fix typos, grammar, and non-functional content.
**Role**: `agent:tier-1`

| Allowed Paths  | Allowed Operations | Prohibited Actions           |
| :------------- | :----------------- | :--------------------------- |
| `docs/**/*.md` | `create`, `update` | Modifying `docs/governance/` |
| `*.md` (root)  | `update`           | Modifying `CONTRIBUTING.md`  |
| `AGENTS.md`    | `read`             | Editing instructions         |

**Requires**:

- PR Label: `agent:docs-only`

## Tier 2: Feature Coder (Builder Agents)

**Scope**: Isolated feature development within safe boundaries.
**Role**: `agent:tier-2`

| Allowed Paths           | Allowed Operations           | Prohibited Actions                    |
| :---------------------- | :--------------------------- | :------------------------------------ |
| `packages/*`            | `create`, `update`, `delete` | Modifying `packages/shared-core`      |
| `apps/web/src/*`        | `create`, `update`           | Modifying `auth` or `billing` modules |
| `server/src/services/*` | `create`, `update`           | Modifying `server/src/infra/`         |

**Requires**:

- PR Label: `agent:feature`
- Pre-merge Review: Human Owner required

## Tier 3: Core Coder (Architect Agents)

**Scope**: Core system logic, infrastructure, and cross-cutting concerns.
**Role**: `agent:tier-3`

| Allowed Paths         | Allowed Operations | Prohibited Actions            |
| :-------------------- | :----------------- | :---------------------------- |
| `server/src/**`       | `all`              | Direct push to `main`         |
| `infra/**`            | `create`, `update` | Deleting production resources |
| `.github/workflows/*` | `read`             | Modifying CI/CD pipelines     |

**Requires**:

- PR Label: `agent:core`
- Pre-merge Review: 2x Human Owners (including 1x Governance Lead)

## Tier 4: System & Governance (Omnipotent Agents)

**Scope**: CI/CD, Governance Rules, Security Policies, Release Management.
**Role**: `agent:tier-4` (e.g., Jules, ReleaseBots)

| Allowed Paths        | Allowed Operations | Prohibited Actions             |
| :------------------- | :----------------- | :----------------------------- |
| `.github/**`         | `all`              | None (subject to Audit)        |
| `docs/governance/**` | `all`              | Violation of `CONSTITUTION.md` |
| `policy/**`          | `all`              | Weakening security gates       |

**Requires**:

- PR Label: `agent:system`
- **Strict Audit**: All actions must be logged to `provenanceLedger`.
