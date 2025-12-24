# IntelGraph / Summit Maestro — Comprehensive Repository Review

_Generated: 2025-09-01 07:38:03_

## Executive Summary

Overall, the repository is a substantial, production‑aspiring monorepo (client/server/services/packages) with strong CI/CD coverage, extensive Helm/K8s assets, and a thoughtful compliance/observability posture. The core risks that merit immediate attention are:

- **Package management friction**: mixed lockfiles (`pnpm-lock.yaml` + `package-lock.json`), strict Node engines (`>=18.18 <20`), and a workspace resolution edge case around `@intelgraph/maestro-sdk` driving a `404` when installing dependencies.
- **Secrets hygiene**: `.env` is committed and contains development credentials and JWT secrets; move to templated examples and secret managers.
- **Repo hygiene**: runtime logs and generated validation artifacts live at the root; redirect to `artifacts/` and ignore in Git.
- **Lint edge case**: a false‑positive/awkward `no-unused-vars` situation around `_userId` in `orchestration-service.ts` causing commit friction.

If we address these four items, the project will install and iterate smoothly across machines/runners and be safer to open‑source components where desired.

---

## Top‑Level Facts

- **Root name**: `intelgraph-platform` — version `1.0.1`, private: `True`
- **Workspaces**: ['packages/*', 'client', 'server']
- **pnpm workspace globs**: ['client', 'server', 'services/*', 'packages/*']
- **Engines**: {'node': '>=18.18 <20', 'npm': '>=8.0.0'}
- **Lockfiles present**: ['pnpm-lock.yaml', 'package-lock.json']
- **Internal SDK**: `packages/sdk-ts` version `0.1.0`; required by `packages/tasks-core` as `@intelgraph/maestro-sdk` with spec `^0.1.0`
- **.env committed**: True
- **.gitignore includes .env**: False

**Representative structure (top level, truncated):**

```
  - .aider.tags.cache.v4
  - .archive
  - .githooks
  - .github
  - .grok
  - .husky
  - .zap
  - RUNBOOKS
  - absorption
  - active-measures-module
  - ai-ml-suite
  - alerting
  - analysis
  - analytics
  - api
  - apps
  - archive
  - audit
  - benchmarks
  - charts
  - cli
  - client
  - cognitive-insights
  - cognitive-targeting-engine
  - cognitive_insights_engine
  - competitive
  - conductor-ui
  - config
  - connectors
  - contracts
  - copilot
  - dash
  - dashboard
  - data
  - data-pipelines
  - db
  - deescalation-coach
  - deploy
  - docker
  - docs
```

---

## Build & Tooling Review

### Node & Package Manager

- `.nvmrc` pins **Node 18.20.4** while `engines.node` is **`>=18.18 <20`**. Your recent error used **Node 20.19.4**, which rightly tripped the engines gate.
- Both **`pnpm-lock.yaml`** and **`package-lock.json`** are present. Pick **pnpm** and delete `package-lock.json` to remove ambiguity.
- Ensure **Corepack** is enabled on dev/CI machines and pin pnpm in `package.json`:

```jsonc
// package.json (root)
"packageManager": "pnpm@10.15.0"
```

### Workspace Linking for `@intelgraph/maestro-sdk`

`@intelgraph/maestro-sdk` lives at `packages/sdk-ts` and is consumed by `packages/tasks-core`. With pnpm, prerelease linking is most reliable when you **force workspace resolution**:

```jsonc
// packages/tasks-core/package.json
"dependencies": {
  "@intelgraph/maestro-sdk": "workspace:^"
}
```

Additionally, add guardrails at the root:

```jsonc
// package.json
"pnpm": {
  "overrides": {
    "@intelgraph/maestro-sdk": "workspace:^"
  }
}
```

**Clean install sequence (Option A — stay on Node 18):**

```bash
nvm use 18.20.4
corepack enable
pnpm -v
git clean -xfd
pnpm -w install
pnpm -w -r build
```

**Option B — move to Node 20/22 (if desired):**

- Bump `engines.node` across the repo to `>=20.11 <23` after confirming transitive deps support it.
- Update CI runners to Node 20 LTS or 22 LTS.
- Re‑lock with `pnpm -w install`.

### Linting & the `_userId` Warning

The line reported by ESLint is in `recordOrchestrationResult`:

```
 512:   private calculateComplianceScore(result: any): number {
 513:     let score = 1.0;
 514:
 515:     // Deduct for missing citations
 516:     if (result.citations.length === 0) {
 517:       score -= 0.3;
 518:     }
 519:
 520:     // Deduct for contradictions
 521:     score -= (result.contradictions.length * 0.1);
 522:
 523:     // Deduct for warnings
 524:     if (result.warnings) {
 525:       score -= (result.warnings.length * 0.05);
 526:     }
 527:
 528:     return Math.max(0, Math.min(1, score)) * 100;
 529:   }
 530:
 531:   private async recordOrchestrationResult(
 532:     result: any,
 533:     request: OrchestrationRequest,
 534:     _orchestrationId: string
 535:   ): Promise<void> {
 536:     // Record in audit log for compliance
 537:     logger.info('Orchestration result recorded', {
 538:       orchestrationId: _orchestrationId,
 539:
 540:       _userId: request.context.userId,
 541:       tenantId: request.context.tenantId,
 542:       sourcesUsed: result.sourcesUsed,
 543:       cost: result.cost,
 544:       confidence: result.confidence,
 545:       complianceScore: this.calculateComplianceScore(result)
 546:     });
 547:
 548:     // Update rate limiter
 549:     await this.rateLimiter.recordSuccessfulFetch('global', request.context.tenantId);
 550:   }
 551: }
```

Since property names aren’t “unused variables,” the warning likely stems from the _parameter_ `_userId` elsewhere or a rule interaction. Two safe, code‑only fixes (no config changes):

1. **Rename the log key** and use a directive just for that line:

```ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
{ userId: request.context.userId, ... }
```

2. **Remove the leading underscore** on the parameter you don’t actually use and reference it in a void statement once to satisfy the rule:

```ts
private async validatePurpose(purpose: string, userId: string) {
  void userId; // explicit: intentionally unused
  ...
}
```

---

## Security, Secrets & Compliance

- `.env` is checked in and contains dev DB passwords and `JWT_SECRET`. Even in private repos, this is risky.
  - **Action**: add `.env` to `.gitignore`; keep **`.env.example`** as the canonical template.
  - **Action**: route secrets through a manager (SOPS + KMS, Doppler, Infisical, AWS Secrets Manager). Reflect this in Docker/Helm values.
- GitHub Actions: you have strong coverage (CI, release gates, container security). Ensure:
  - `permissions: { contents: read }` defaults and least‑privilege tokens
  - OIDC‑based cloud auth (no long‑lived cloud keys)
  - `concurrency:` groups to prevent parallel deploy step overlap
- Supply chain:
  - Generate SBOMs (Syft) on build, scan with Grype, sign images with Cosign.
  - Keep `packageManager` pinned and avoid mixed lockfiles.

---

## CI/CD & Observability

- Workflows are comprehensive (`ci.yml`, `sec-audit.yml`, `container-security.yml`, `release-gate.yml`, `server-startup-smoke.yml`, etc.).
- Recommendations:
  - **Cache** pnpm store (`~/.pnpm-store`) and `node_modules/.pnpm` to reduce build times.
  - Add an **otel collector** and instrument server & workers with OpenTelemetry (traces + metrics). Leverage your existing Prometheus counters/histograms and export exemplars.

---

## Repo Hygiene

- Root contains logs and validation artifacts (e.g., `tranche-process-*.log`, `validation-report-*.txt/json`).  
  **Action**: move to `artifacts/` and add to `.gitignore`:
  ```gitignore
  artifacts/
  *.log
  validation-report*.{txt,json}
  ```

---

## Architecture & Code Quality (High‑Level)

- **Monorepo** with workspaces: `client` (Vite/React), `server` (Node/TS), `services/*`, `packages/*` (incl. `@intelgraph/maestro-sdk`), plus extensive Helm/K8s assets.
- **Back end**: policy/compliance gates, Redis rate limiting, premium model routing, and web orchestration layers are well‑structured with clear separation of concerns.
- **Front end**: GraphQL persisted ops and a solid lint/test toolchain.
- **Infra**: Many Dockerfiles & Helm charts; consider standardizing base images and non‑root users across Dockerfiles.

---

## Immediate Action Checklist (Next 24–48h)

1. **Standardize on pnpm**: delete `package-lock.json`; add `"packageManager": "pnpm@10.15.0"`.
2. **Fix local linking for `@intelgraph/maestro-sdk`**: change spec to `"workspace:^"` and add pnpm `overrides` at root.
3. **Unblock ESLint**: apply one of the two `_userId` remedies above.
4. **Secrets hygiene**: add `.env` to `.gitignore`; move real values to a secret manager; keep `.env.example` only.
5. **Node version policy**: either enforce Node 18.20.4 via nvm/CI or bump `engines.node` (after validation) to Node 20/22 LTS.
6. **Clean artifacts**: move logs/validation outputs under `artifacts/` and ignore.

---

## Nice‑to‑Have (This Sprint)

- Add a `CONTRIBUTING.md`, `SECURITY.md`, and `ARCHITECTURE.md` pointer index.
- Introduce `just` tasks mirroring Makefile for dev ergonomics on macOS/Linux.
- Add `CODEOWNERS` review gates on critical paths (already present; verify coverage).
- Add end‑to‑end “golden path” smoke job gating merges (client + server).

---

## Appendix — ESLint snippet provenance

_(for quick reference to the warning site)_

```
 512:   private calculateComplianceScore(result: any): number {
 513:     let score = 1.0;
 514:
 515:     // Deduct for missing citations
 516:     if (result.citations.length === 0) {
 517:       score -= 0.3;
 518:     }
 519:
 520:     // Deduct for contradictions
 521:     score -= (result.contradictions.length * 0.1);
 522:
 523:     // Deduct for warnings
 524:     if (result.warnings) {
 525:       score -= (result.warnings.length * 0.05);
 526:     }
 527:
 528:     return Math.max(0, Math.min(1, score)) * 100;
 529:   }
 530:
 531:   private async recordOrchestrationResult(
 532:     result: any,
 533:     request: OrchestrationRequest,
 534:     _orchestrationId: string
 535:   ): Promise<void> {
 536:     // Record in audit log for compliance
 537:     logger.info('Orchestration result recorded', {
 538:       orchestrationId: _orchestrationId,
 539:
 540:       _userId: request.context.userId,
 541:       tenantId: request.context.tenantId,
 542:       sourcesUsed: result.sourcesUsed,
 543:       cost: result.cost,
 544:       confidence: result.confidence,
 545:       complianceScore: this.calculateComplianceScore(result)
 546:     });
 547:
 548:     // Update rate limiter
 549:     await this.rateLimiter.recordSuccessfulFetch('global', request.context.tenantId);
 550:   }
 551: }
```

---

_Prepared automatically from the uploaded archive; no external network calls were used._
