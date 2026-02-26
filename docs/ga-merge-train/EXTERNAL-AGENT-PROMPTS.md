# External Agent Prompts — GA Release v5.0.0

> Ready-to-paste prompts for Claude Code CLI, Claude Code UI, Codex, Antigravity, and other agents.
> Each prompt is self-contained with full context. Copy the relevant section into your tool of choice.

**Date:** 2026-02-26
**Branch:** `claude/merge-prs-ga-release-XjiVk`
**Status:** 597 PRs merged, security fixes applied, lint clean, release candidate tagged `v5.0.0-rc.1`

---

## Table of Contents

1. [Claude Code CLI — TypeScript Type Errors Fix](#1-claude-code-cli--typescript-type-errors-fix)
2. [Claude Code CLI — npm Audit Remediation](#2-claude-code-cli--npm-audit-remediation)
3. [Claude Code CLI — ESLint Warnings Cleanup](#3-claude-code-cli--eslint-warnings-cleanup)
4. [Claude Code UI — PR Creation & Review](#4-claude-code-ui--pr-creation--review)
5. [Codex — Integration Test Suite](#5-codex--integration-test-suite)
6. [Codex — Docker Stack Validation](#6-codex--docker-stack-validation)
7. [Antigravity — Full Regression Test](#7-antigravity--full-regression-test)
8. [Antigravity — Performance Baseline](#8-antigravity--performance-baseline)
9. [Claude Code CLI — Dependency Graph Audit](#9-claude-code-cli--dependency-graph-audit)
10. [Claude Code CLI — Missing Test Coverage](#10-claude-code-cli--missing-test-coverage)

---

## 1. Claude Code CLI — TypeScript Type Errors Fix

**Tool:** Claude Code CLI (`claude`)
**Time estimate:** Medium session
**Priority:** HIGH — blocks `pnpm typecheck`

```
You are working on the BrianCLong/summit repository, branch claude/merge-prs-ga-release-XjiVk.
This is a v5.0.0 GA release branch with 597 merged PRs.

TASK: Fix all TypeScript type errors so that `pnpm typecheck` passes.

CONTEXT:
- `pnpm typecheck` currently fails with errors in services/graph-core
- This is a pre-existing issue from main, not introduced by the merge
- The monorepo uses pnpm workspaces with TypeScript 5.x
- Key tsconfig files: tsconfig.json (root), services/*/tsconfig.json, packages/*/tsconfig.json

APPROACH:
1. Run `pnpm typecheck` and capture all errors
2. Categorize: missing type definitions vs actual type mismatches vs missing imports
3. Fix in order: type definition stubs first, then import fixes, then type annotations
4. Do NOT change any runtime logic — type-only fixes
5. Run `pnpm typecheck` again to verify zero errors

CONSTRAINTS:
- Surgical rule: only touch type annotations, imports, and type definition files
- Do not refactor code or change behavior
- Do not add new dependencies unless absolutely necessary (prefer @types/* packages)
- Commit with message: "fix(types): resolve TypeScript type errors for GA gate"
- Push to branch: claude/merge-prs-ga-release-XjiVk
```

---

## 2. Claude Code CLI — npm Audit Remediation

**Tool:** Claude Code CLI (`claude`)
**Priority:** HIGH — 2 critical, 14 high vulnerabilities

```
You are working on the BrianCLong/summit repository, branch claude/merge-prs-ga-release-XjiVk.

TASK: Remediate npm audit vulnerabilities (31 total: 2 critical, 14 high, 10 moderate, 5 low).

KNOWN VULNERABILITIES:
- CRITICAL: micromatch (ReDoS), semver (ReDoS)
- HIGH: braces, tar, tough-cookie, ws, word-wrap, postcss (and others)
- Most are in transitive dependencies

APPROACH:
1. Run `pnpm audit` to get current state
2. Try `pnpm audit fix` for automatic fixes
3. For remaining: check if newer versions of direct dependencies resolve transitives
4. Update pnpm-lock.yaml with `pnpm install`
5. For unfixable transitives, document in `docs/ga-merge-train/SECURITY-SCAN-REPORT.md`
6. Add `pnpm.overrides` in package.json for critical transitive dep overrides if safe
7. Verify: `pnpm audit` should show 0 critical, 0 high

CONSTRAINTS:
- Do not upgrade major versions of direct dependencies without checking breaking changes
- Test after each change: `pnpm test:quick && pnpm build:server`
- Commit with: "fix(deps): remediate npm audit vulnerabilities for GA"
- Push to: claude/merge-prs-ga-release-XjiVk
```

---

## 3. Claude Code CLI — ESLint Warnings Cleanup

**Tool:** Claude Code CLI (`claude`)
**Priority:** MEDIUM — 182 warnings (0 errors)

```
You are working on the BrianCLong/summit repository, branch claude/merge-prs-ga-release-XjiVk.

TASK: Reduce ESLint warnings from 182 to <20.

CONTEXT:
- ESLint currently shows 0 errors, 182 warnings
- Run: `npx eslint . --ext .ts,.tsx,.js,.jsx 2>&1 | tail -5` to see summary
- The config is ESLint v10 flat config in eslint.config.js

APPROACH:
1. Run ESLint and categorize warnings by rule
2. For each rule category, determine if warnings are:
   a. Auto-fixable: run `npx eslint --fix` for those rules
   b. Safe to fix manually: fix them
   c. Intentional/acceptable: add targeted eslint-disable comments with justification
3. Do NOT disable rules globally — use per-line or per-file disables only
4. Run full lint after: `npx eslint . --ext .ts,.tsx,.js,.jsx`

CONSTRAINTS:
- Do not change runtime behavior
- Do not introduce new lint rules
- Commit with: "fix(lint): resolve ESLint warnings for GA release"
- Push to: claude/merge-prs-ga-release-XjiVk
```

---

## 4. Claude Code UI — PR Creation & Review

**Tool:** Claude Code UI (claude.ai/code) or GitHub UI
**Priority:** CRITICAL — blocking GA merge to main

```
TASK: Create a pull request from branch claude/merge-prs-ga-release-XjiVk → main.

The PR description is pre-written at: docs/ga-merge-train/PR-DESCRIPTION.md

Steps:
1. Go to: https://github.com/BrianCLong/summit/compare/main...claude/merge-prs-ga-release-XjiVk
2. Click "Create pull request"
3. Title: "feat: GA Release v5.0.0 — 597 PRs Merged via Automated Merge Train"
4. Body: Copy contents of docs/ga-merge-train/PR-DESCRIPTION.md
5. Add labels: release, ga, v5.0.0
6. Request reviewers as appropriate
7. Do NOT merge yet — this is for review

ALSO: Push the release candidate tag:
  git push origin v5.0.0-rc.1
(The tag already exists locally but could not be pushed via the git proxy.)
```

---

## 5. Codex — Integration Test Suite

**Tool:** OpenAI Codex
**Priority:** HIGH — needed for full regression confidence

```
Repository: BrianCLong/summit
Branch: claude/merge-prs-ga-release-XjiVk
Task: Write integration tests for the 6 highest-risk merged features.

TARGET AREAS (from security review):
1. InboundAlertService signature verification
   - File: server/src/integrations/inbound/service.ts
   - Test: valid HMAC-SHA256, invalid HMAC, timing attack resistance, missing signature

2. Multi-tenant isolation in AuthorizationService
   - Test: cross-tenant access denied, tenant scoping on queries, admin bypass

3. IntelligentCopilot safe rendering
   - File: client/src/components/ai/IntelligentCopilot.jsx
   - Test: markdown bold rendering, XSS payload rejection, plain text passthrough

4. HelpArticleView HTML sanitization
   - File: packages/help-overlay/src/components/HelpArticleView.tsx
   - Test: script stripping, iframe removal, event handler removal, javascript: URL blocking

5. Entity Resolution scoring
   - File: er-service/src/scoring/scorer.ts
   - Test: boolean/number/string scoring, edge cases

6. NLQ Copilot duration handling
   - File: plugins/nlq-copilot/src/index.ts
   - Test: timeout handling, duration calculation

OUTPUT: Place tests adjacent to source files as *.test.ts or *.spec.ts.
Run with: pnpm jest --passWithNoTests
Commit with: "test: add integration tests for high-risk GA features"
```

---

## 6. Codex — Docker Stack Validation

**Tool:** OpenAI Codex (or any agent with Docker access)
**Priority:** HIGH — `make ga` blocked at Docker steps

```
Repository: BrianCLong/summit
Branch: claude/merge-prs-ga-release-XjiVk

TASK: Run the full `make ga` pipeline in a Docker-enabled environment.

CONTEXT:
- `make ga` has 7 stages: Lint+Test → Clean Environment → Services Up → Readiness → Health → Smoke → Security
- Stages 1 (Lint+Test) PASSES in current CI
- Stages 2-7 require Docker daemon running
- docker-compose.dev.yaml defines: gateway, neo4j, redis, typesense, postgres, kafka, ui

STEPS:
1. Ensure Docker daemon is running
2. Run: make ga
3. Capture output of each stage
4. For any failures: diagnose and fix (missing env vars, port conflicts, image pulls)
5. Verify all health endpoints respond
6. Run smoke tests against the running stack
7. Save results to docs/ga-merge-train/MAKE-GA-RESULTS.md

EXPECTED SERVICES:
- Gateway (port 8080): /health should return 200
- UI (port 3000): should serve React app
- Neo4j (port 7474/7687): browser + bolt
- Redis (port 6379): PING → PONG
- Typesense (port 8108): /health
- Postgres (port 5432): pg_isready
- Kafka (port 9092): broker metadata

Commit results with: "docs: add make ga full pipeline results"
```

---

## 7. Antigravity — Full Regression Test

**Tool:** Antigravity (or equivalent CI agent)
**Priority:** HIGH — GA readiness gate

```
Repository: BrianCLong/summit
Branch: claude/merge-prs-ga-release-XjiVk
Release: v5.0.0-rc.1 (597 PRs merged)

TASK: Run full regression suite and report results.

TEST COMMANDS (run in order):
1. pnpm test:quick          — Quick sanity (should PASS)
2. pnpm build:server        — TypeScript compile (should PASS, warnings OK)
3. pnpm lint                 — ESLint (should PASS: 0 errors)
4. pnpm format:check        — Prettier (should PASS)
5. pnpm jest --passWithNoTests -- --ci  — Full Jest suite
6. pnpm test:release-bundle-sdk       — SDK bundle tests
7. pnpm test:release-scripts           — Release script tests (expect 4/23 fail — known)
8. cd .venv && source bin/activate && ruff check .  — Python lint (should PASS)
9. cd .venv && source bin/activate && mypy src/     — Python types (should PASS)

REPORT FORMAT:
For each command:
- Exit code
- Duration
- Error count / warning count
- First 3 error messages if any

Save to: docs/ga-merge-train/REGRESSION-RESULTS-v5.0.0-rc.1.md
Commit with: "docs: add regression test results for v5.0.0-rc.1"
```

---

## 8. Antigravity — Performance Baseline

**Tool:** Antigravity or k6/artillery agent
**Priority:** MEDIUM — needed before prod promotion

```
Repository: BrianCLong/summit
Branch: claude/merge-prs-ga-release-XjiVk

TASK: Establish performance baseline for v5.0.0-rc.1.

PREREQUISITES: Docker stack must be running (see Prompt #6).

BASELINE TARGETS (from golden paths):
- GraphQL query p95 < 200ms
- Entity resolution batch p95 < 500ms
- Search query p95 < 100ms
- Ingest pipeline throughput > 1000 events/sec
- WebSocket fanout p95 < 50ms

APPROACH:
1. Check if k6 scripts exist: scripts/k6/ or tests/perf/
2. If they exist, run them against the Docker stack
3. If not, create basic k6 scripts for:
   - GraphQL health + simple query
   - REST API CRUD operations
   - Search endpoint
4. Run 3 iterations of 60-second load tests
5. Record p50, p95, p99, max, error rate

Save to: docs/ga-merge-train/PERF-BASELINE-v5.0.0-rc.1.md
Commit with: "docs: add performance baseline for v5.0.0-rc.1"
```

---

## 9. Claude Code CLI — Dependency Graph Audit

**Tool:** Claude Code CLI (`claude`)
**Priority:** MEDIUM — supply chain hygiene

```
You are working on the BrianCLong/summit repository, branch claude/merge-prs-ga-release-XjiVk.

TASK: Audit the monorepo dependency graph for circular dependencies, unused packages,
and workspace configuration issues.

APPROACH:
1. Map pnpm workspace packages: `pnpm ls --depth 0 -r --json`
2. Check for circular deps: look for A→B→A patterns in workspace:* dependencies
3. Identify packages with no dependents (orphan packages)
4. Verify all workspace:* references resolve correctly
5. Check for duplicate versions of the same package across workspaces
6. Verify pnpm-lock.yaml is in sync: `pnpm install --frozen-lockfile`

OUTPUT: Summary report with:
- Workspace package map (name → path → deps)
- Circular dependency chains (if any)
- Orphan packages
- Version conflicts
- Recommendations

Save to: docs/ga-merge-train/DEPENDENCY-AUDIT-v5.0.0.md
Commit with: "docs: add dependency graph audit for v5.0.0"
```

---

## 10. Claude Code CLI — Missing Test Coverage

**Tool:** Claude Code CLI (`claude`)
**Priority:** MEDIUM — confidence gap analysis

```
You are working on the BrianCLong/summit repository, branch claude/merge-prs-ga-release-XjiVk.

TASK: Identify critical code paths with no test coverage.

FOCUS AREAS (highest risk):
1. server/src/integrations/ — external integrations (inbound alerts, webhooks)
2. server/src/auth/ — authentication and authorization
3. er-service/src/ — entity resolution scoring
4. services/graph-core/ — core graph operations
5. client/src/components/ai/ — AI copilot components

APPROACH:
1. For each focus area, list source files and check for corresponding test files
2. Check Jest config for coverage thresholds
3. Try running: `pnpm jest --coverage --coverageReporters=text-summary 2>&1 | head -20`
4. Identify files with 0% coverage that contain security-sensitive logic
5. Prioritize: auth, crypto, input validation, data access

OUTPUT: Coverage gap report with:
- File → has test? → risk level
- Recommended test priorities (top 20 files)
- Suggested test skeletons for top 5

Save to: docs/ga-merge-train/COVERAGE-GAP-ANALYSIS-v5.0.0.md
Commit with: "docs: add coverage gap analysis for v5.0.0"
```

---

## Quick Reference — Which Tool for What

| Task | Best Tool | Prompt # |
|------|-----------|----------|
| TypeScript type errors | Claude Code CLI | 1 |
| npm vulnerabilities | Claude Code CLI | 2 |
| ESLint warnings | Claude Code CLI | 3 |
| Create PR on GitHub | Claude Code UI / GitHub UI | 4 |
| Integration tests | Codex | 5 |
| Docker validation | Codex / Docker agent | 6 |
| Full regression | Antigravity / CI | 7 |
| Performance baseline | Antigravity / k6 | 8 |
| Dependency audit | Claude Code CLI | 9 |
| Coverage analysis | Claude Code CLI | 10 |

---

## Execution Order (Recommended)

**Phase 1 — Unblock (do first, in parallel):**
- Prompt #4: Create PR (manual — GitHub UI)
- Prompt #1: Fix TypeScript type errors
- Prompt #2: npm audit remediation

**Phase 2 — Validate (after Phase 1):**
- Prompt #5: Integration tests
- Prompt #7: Full regression suite

**Phase 3 — Harden (after Phase 2):**
- Prompt #3: ESLint warnings cleanup
- Prompt #6: Docker stack validation
- Prompt #9: Dependency audit
- Prompt #10: Coverage gap analysis

**Phase 4 — Baseline (after Docker stack is up):**
- Prompt #8: Performance baseline
