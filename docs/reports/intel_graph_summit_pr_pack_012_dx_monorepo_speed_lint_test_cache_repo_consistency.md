# PR Pack 012 — Developer Experience, Monorepo Speed, Lint/Test Caching, Repo Consistency (Ready‑to‑merge)

Twelve PRs that make day‑to‑day development faster, safer, and more consistent: pnpm + Turborepo remote caching, TS project refs & incremental builds, unified lint/format hooks, actionlint/hadolint/gitleaks pre‑push, faster tests (swc‑jest + Testcontainers), CI that only builds what changed, PR hygiene automation, devcontainers, docs/ADR discipline, and repo‑wide consistency checks. Each PR includes rollback + cutover.

---

## PR 132 — pnpm workspaces + Turborepo (remote cache)

**Purpose:** Speed builds/tests; cache across CI and dev.

**Files**

**`pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
```

**`package.json`** (root excerpt)

```json
{
  "packageManager": "pnpm@9",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.1.0"
  }
}
```

**`turbo.json`**

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "build/**"] },
    "test": { "dependsOn": ["build"], "outputs": [] },
    "lint": { "outputs": [] },
    "typecheck": { "outputs": ["tsbuildinfo/**"] }
  }
}
```

**`.github/workflows/ci.yml`** (cache sections for Turborepo + pnpm store)

**Rollback:** Keep npm/yarn lock; set `packageManager` back; remove turbo.

---

## PR 133 — TypeScript project references & incremental build

**Purpose:** Faster builds, reliable cross‑pkg typings.

**Files**

**`tsconfig.base.json`** — shared compiler options.

**`packages/*/tsconfig.json`** — `composite: true`, `declaration: true`, `declarationMap: true`.

**`apps/*/tsconfig.json`** — `references` to local packages.

**Rollback:** Remove references; back to single‑project `tsc`.

---

## PR 134 — ESLint (flat config) + Prettier unified + lint‑staged

**Purpose:** One linter to rule them all; auto‑fix before commit.

**Files**

**`eslint.config.mjs`** (flat config with `@typescript-eslint`, `unused-imports`, `import`, `sonarjs`).

**`.prettierrc`**, **`.prettierignore`**.

**`lint-staged.config.js`**

```js
export default {
  '**/*.{ts,tsx,js,jsx}': ['eslint --fix'],
  '**/*.{md,css,scss,json,yaml,yml}': ['prettier --write'],
};
```

**Rollback:** Keep prior lint rules; remove lint‑staged.

---

## PR 135 — Ultra‑fast hooks (lefthook) + actionlint/hadolint/gitleaks

**Purpose:** Fail fast locally; stop bad commits/pushes.

**Files**

**`lefthook.yml`**

```yaml
pre-commit:
  parallel: true
  commands:
    lint: { run: pnpm lint-staged }
    typecheck: { run: pnpm -w typecheck, stage_fixed: true }
pre-push:
  parallel: true
  commands:
    actionlint: { run: npx actionlint }
    hadolint: { run: npx hadolint Dockerfile || true }
    gitleaks: { run: npx gitleaks detect --redact --no-banner }
```

**Rollback:** Disable lefthook by removing `pre-commit`/`pre-push` scripts.

---

## PR 136 — Faster tests: swc‑jest + deterministic env + Testcontainers

**Purpose:** Cut unit test time and stabilize integration tests.

**Files**

**`jest.config.js`** (use `@swc/jest`, collect coverage, `testEnvironment: node`).

**`tests/setup-env.ts`** — seed RNG/timezone/locale; freeze timers where safe.

**`tests/integration/db.test.ts`** (example using `testcontainers` for Postgres/Redis).

**Rollback:** Restore `ts-jest`; skip integration suite.

---

## PR 137 — CI: build only what changed (affected graph)

**Purpose:** Huge CI savings on monorepo.

**Files**

**`.github/workflows/ci.yml`** (replace `turbo run test` with `turbo run test --filter=...[${{ github.sha }}~1]` / base ref range).

**`scripts/changed-packages.sh`** — helper to compute base/target.

**Rollback:** Run full test matrix unconditionally.

---

## PR 138 — PR hygiene automation (DangerJS)

**Purpose:** Enforce description, linked issue, size warnings, docs + tests.

**Files**

**`dangerfile.ts`**

```ts
import { warn, fail, markdown } from 'danger';
if (!danger.github.pr.body || danger.github.pr.body.length < 20)
  fail('PR description too short');
if (!/#[0-9]+/.test(danger.github.pr.body)) warn('Link an issue (e.g., #123)');
if (danger.github.pr.additions + danger.github.pr.deletions > 1500)
  warn('Consider splitting: PR is large');
// Require tests/docs for src changes
```

**`.github/workflows/danger.yml`** — run on PR with `GITHUB_TOKEN`.

**Rollback:** Remove workflow or make non‑blocking.

---

## PR 139 — Devcontainer (Codespaces/containers) + VS Code defaults

**Purpose:** 1‑click consistent dev env.

**Files**

**`.devcontainer/devcontainer.json`** — Node 20, PNPM, Docker‑in‑Docker, k8s & Helm CLIs.

**`.vscode/settings.json`** — format on save, eslint integration, spellcheck dictionary.

**`.vscode/extensions.json`** — recommended extensions.

**Rollback:** Developers keep local envs; optional.

---

## PR 140 — Docs site + ADRs + preview per PR

**Purpose:** Living docs; decision history; instant previews.

**Files**

**`docs/`** (Docusaurus skeleton) with `docs/runbooks`, `docs/adr`.

**`adr/0001-use-helm-terraform.md`** — example ADR template.

**`.github/workflows/docs-preview.yml`** — builds docs and uploads Pages artifact for PR comment preview.

**Rollback:** Keep README‑only; disable preview workflow.

---

## PR 141 — Repo consistency: EditorConfig, .gitattributes, license headers

**Purpose:** Normalize line endings, encodings, and headers across files.

**Files**

**`.editorconfig`**, **`.gitattributes`** (LF for code, lockfiles as text), **`scripts/license-header.js`** + workflow to check/insert Apache‑2.0 headers.

**Rollback:** Make header check warn‑only.

---

## PR 142 — Onboarding: `make doctor` + Taskfile + bootstrap

**Purpose:** New devs productive in minutes.

**Files**

**`Makefile`**

```make
.PHONY: doctor bootstrap dev test
bootstrap: ; pnpm i
doctor: ; node scripts/doctor.js
```

**`Taskfile.yml`** (optional alternative to Make).

**`scripts/doctor.js`** — checks Node version, pnpm, Docker, kubectl/helm, cluster auth, secrets access.

**Rollback:** Use README checklist only.

---

## PR 143 — Triage/labels/auto‑assign + issue/PR templates

**Purpose:** Sane triage and ownership; less ops toil.

**Files**

**`.github/labeler.yml`** — path → label rules (e.g., `apps/web/**` → `area:web`).

**`.github/workflows/auto-assign.yml`** — auto‑assign CODEOWNERS on PR.

**`.github/ISSUE_TEMPLATE/bug.yaml`**, **`feature.yaml`**; **`PULL_REQUEST_TEMPLATE.md`** (checklist: tests, docs, migration plan if DB touches, SLO gates judgment).

**Rollback:** Keep manual triage.

---

# Cutover (half day)

1. Land **pnpm + Turborepo** (PR 132) behind a feature branch; enable remote cache (GitHub Actions cache or S3) and confirm speedup.
2. Add **TS project refs** (PR 133) to top packages first; convert rest incrementally.
3. Introduce **lint/format hooks** (PR 134–135) in warn‑only for 48h; then enforce.
4. Switch **tests to swc-jest** and stabilize integration with **Testcontainers** (PR 136).
5. Flip CI to **affected graph** (PR 137); monitor run time & cache hit rate.
6. Turn on **DangerJS** (PR 138) and **labeler/auto‑assign** (PR 143).
7. Roll out **devcontainer** (PR 139) and **docs/ADR** (PR 140) with preview.
8. Apply **repo consistency** (PR 141) and **onboarding scripts** (PR 142).

# Rollback

- Keep npm/yarn and full CI builds; disable turbo cache.
- Revert swc‑jest to ts‑jest; skip integration tests in CI.
- Disable hooks and DangerJS temporarily.
- Docs/ADR preview can be turned off without code impact.

# Ownership

- **DevEx/Platform:** PR 132–137, 139, 141–142
- **Docs/Arborist:** PR 140, 143
- **QA:** PR 136, 137, 138
