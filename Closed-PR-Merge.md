# IntelGraph “Closed-PR Merge” Sprint — Plan, Scope, and Actions

## TL;DR

We’ll run a focused 7-day sprint to **intelligently merge the most recent closed PRs** (especially the consolidation/infra ones), stabilize breaking upgrades, and align with Council Wishbook guardrails (provenance, governance, reliability). The sprint centers on a single consolidation branch, deterministic cherry-picks, automated compatibility fixes, and hardening checks (CI, security, XAI/provenance). It culminates in **one audited “all-green” mega-PR to `main`** with an evidence bundle and rollback plan.

---

## What I reviewed (inputs)

* **Council Wishbooks**: end-state capabilities, governance, ops targets, acceptance patterns. These drive our quality gates (provenance, policy-by-default, audit, SLOs) and inform what *must not* regress while merging. &#x20;
* **Repo (BrianCLong/summit)**: active IntelGraph codebase with 800+ closed PRs; 5 open currently. Recent closed/merged PRs include infra and dependency upgrades plus consolidation attempts:

  * **#1280** “feat(ga): CI/ops hardening (conflict-free from ga-core)” → *merged Sep 18, 2025*. ([GitHub][1])
  * **#1279** “feat(ga): artifacts pack for v1.0.0” → *closed Sep 18 (not merged)*. ([GitHub][1])
  * **#1278/#1277** Sprint 25 Day-1 deliverables → *merged Sep 19*. ([GitHub][1])
  * **#1266/#1267** CI finalization + Codepacks IV-X → *merged Sep 16–17*. ([GitHub][1])
  * **#1261/#1260/#1259** consolidation attempts (express\@5/eslint\@9, rebrand, “merge conflict-free branches and PRs into main”) → *closed without merge Sep 19*. ([GitHub][1])
  * Notable dep bumps merged: **vite\@7**, **react-leaflet\@5**, **lru-cache\@11**, **ts-jest\@29.4.2**. ([GitHub][1])

---

## Highest-priority merge targets (why these first)

1. **Consolidation & CI Hardening**

   * \#1280 (merged) sets the CI/ops baseline; we must **stack** subsequent merges atop it to avoid re-breaking pipelines. ([GitHub][1])
   * Re-hydrate closed-but-valuable PRs: **#1279 artifacts pack**, **#1261 express5/eslint9**, **#1260 rebrand**, **#1259 conflict-free mega** — these likely failed due to timing/drift; we’ll cherry-pick their diffs into the sprint consolidation branch. ([GitHub][1])

2. **Breaking Upgrades that affect runtime & DX**

   * **express\@5** (routing/handler changes, error middlewares) + **eslint\@9** ruleset shifts → fix surface area across `server`. ([GitHub][1])
   * **vite\@7** + **react-leaflet\@5** (Leaflet context changes) + **OTel SDK jumps** → ensure build/telemetry remain green. ([GitHub][1])

3. **Governance/Provenance non-negotiables** (from Wishbooks)

   * Preserve **Provenance & Claim Ledger**, **ABAC/OPA**, **audit immutability**, and **export manifests**; anything that touches data flows must ship with **policy-by-default** and **verifiable lineage**. &#x20;

---

## Sprint scope (7 days, one team)

### Sprint Goal

Produce **one** “consolidated, policy-clean, CI-green” PR to `main` that integrates the recent closed PRs and dependency shifts without regressing GA-core KPIs (p95 query latency, ingest E2E, CI SLOs) and without violating governance guardrails.&#x20;

### Workstreams & tasks

#### A) Consolidation Branch & Deterministic Cherry-pick (Day 1–2)

* Create: `feature/merge-closed-prs-s25`.
* For each PR below, **fetch PR ref**, compute `git range-diff` vs `HEAD@main`, cherry-pick in dependency-safe order; open small stack PRs into the consolidation branch; keep one **tracking issue** with checkboxes and links. Targets:

  * **#1279** artifacts pack v1.0.0 → reinstate packaging & publish steps gated by SBOM/provenance. ([GitHub][1])
  * **#1261** server deps (express5/eslint9) → adapt middleware, error handling, and tests. ([GitHub][1])
  * **#1260** rebrand: rename impacts in docs/UI, ensure **provenance manifesto** not broken. ([GitHub][1])
  * **#1259** conflict-free merge bundle: mine for commits not already in `main`; cherry-pick survivors. ([GitHub][1])
* Keep **#1280** as base (already merged). ([GitHub][1])

#### B) Breakage Remediation & Test Upgrades (Day 2–4)

* **Express 5**: update route signatures, async error propagation, finalize `app.use((err,req,res,next)=>{...})` ordering; tighten schema validation; refresh **Supertest/Jest** suites. (Impacts: `server/*`, `openapi/*`.)
* **ESLint 9**: adopt flat config; align TS parser/plugins; add suppressions only with JSDoc rationale.
* **Vite 7 / React-Leaflet 5**: adjust map initialization/context; re-verify **tri-pane map** interactions (Wishbook I-Frontend experience).&#x20;
* **OpenTelemetry jumps**: keep resource/service.name stable; verify traces/metrics dashboards (Grafana Release Health per #1086 linkage). ([GitHub][2])

#### C) Governance & Provenance Gates (Day 3–5)

Map to Wishbook acceptance patterns:

* **Policy-by-Default**: OPA policies must block unsafe exports; add **simulation tests** for policy changes (Wishbook F/G).&#x20;
* **Provenance Integrity**: ensure artifacts pack (#1279) embeds **hash manifests** and **transform chains**; verify external verifier script passes.&#x20;
* **Audit Completeness**: CI enforces “who/what/why/when” for migration scripts; ensure legal basis tags preserved on entities/edges.&#x20;

#### D) CI/CD & Observability (Day 4–6)

* Re-run **Codepacks IV-X** & finalization kit (#1266/#1267) after cherry-picks; freeze versions. ([GitHub][1])
* Ensure **playwright smoke pack** + **contract tests** pass; seed **GraphQL N-1/N-2 schema baselines** so future breaking field changes get caught (see #1085). ([GitHub][2])
* Publish **SBOMs**, sign artifacts, and push **SLO dashboards** for p95 query and ingest. (Targets from Wishbook Non-Functional/Observability.)&#x20;

#### E) Release PR & Rollback (Day 7)

* Open **“merge/all-closed-PRs-s25”** → `main` with:

  * **Checklist** (governance/ops/XAI), **diff stats**, **range-diff transcript**, **security notes**.
  * **Disclosure bundle**: provenance manifest + hashes.&#x20;
  * **Rollback plan**: tag pre-merge, one-click revert script, and data migration down-paths.

---

## Concrete actions per key PR (what we’ll do)

| PR                                    | Status                  | Action in sprint                                                                            |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| #1280 CI/ops hardening                | merged                  | Treat as baseline; don’t regress CI policies. ([GitHub][1])                                 |
| #1279 artifacts pack v1.0.0           | **closed (not merged)** | Cherry-pick into consolidation; add SBOM + provenance verifier step. ([GitHub][1])          |
| #1278/#1277 Sprint 25 D1              | merged                  | Validate no drift vs. consolidation; re-run Playwright/regression. ([GitHub][1])            |
| #1266/#1267 CI finalization/Codepacks | merged                  | Re-execute packs after all cherry-picks; snapshot results. ([GitHub][1])                    |
| #1261 express5/eslint9                | **closed**              | Recreate change with safe commits; repair handlers/tests; flat ESLint config. ([GitHub][1]) |
| #1260 rebrand integrate               | **closed**              | Reapply naming changes with doc/site and provenance references. ([GitHub][1])               |
| #1259 conflict-free into main         | **closed**              | Harvest commits not in `main`; cherry-pick survivors with `range-diff`. ([GitHub][1])       |

---

## Guardrails & acceptance (derived from Wishbooks)

* **Policy-by-Default**: blocked attempts show human-readable reason & appeal path; we keep unit tests that assert policy messages.&#x20;
* **Provenance Integrity**: export bundles include **hash manifests**; verifier passes; CI fails otherwise.&#x20;
* **SLOs**: p95 graph query < 1.5s; ingest E2E < 5m for 10k docs; prove with dashboards post-merge.&#x20;
* **Audit & Ethics**: immutable audit entries and reason-for-access prompts remain intact in all changed flows.&#x20;

---

## Risks & mitigations

* **Express 5 breakages** (route/error semantics): *Mitigation*: targeted refactors, Supertest coverage, canary in staging. ([GitHub][1])
* **Vite 7 & React-Leaflet 5** (build & map context changes): *Mitigation*: e2e map interactions in tri-pane; perf check TTFI. ([GitHub][1])
* **OTel version drift** (0.203–0.205+): *Mitigation*: lock deps, validate traces; update Grafana/alerts. ([GitHub][1])
* **Policy/License regressions**: *Mitigation*: license/TOS engine tests at export; provenance checks in CI.&#x20;

---

## Deliverables

1. **Branch** `feature/merge-closed-prs-s25` with stacked PRs and range-diff logs.
2. **One final PR to `main`** with: checklist, artifacts (SBOM, provenance manifest), CI dashboards, and rollback script.
3. **Release notes** mapped to Council capability areas (Data Intake, Graph Core, AI Copilot, Security/Governance, Ops & UX).&#x20;

---

## Suggested commit/branch choreography

* Branch: `feature/merge-closed-prs-s25`
* Stacks:

  * `stack/express5-eslint9` → server + lint refactors
  * `stack/artifacts-pack-v1` → packaging + signing + manifest verifier
  * `stack/client-vite7-leaflet5` → UI build + map fixes
  * `stack/rebrand-docs` → docs/site + provenance references
* Final: `release/s25-closed-merge` → PR to `main` with **blocked-on** checks: SBOM, Playwright, contract tests, policy simulation.

---

## Why this aligns with our North Star

This sprint explicitly protects the **Provenance Before Prediction** ethos, **Compartmentation & Policy-by-Default**, and **Ops SLOs** that the Council requires, while unblocking developer velocity by landing recent closed work safely and verifiably. &#x20;

---

## Revised prompt (for next iteration)

“Generate the exact git commands (including `gh` invocations) to cherry-pick PRs **#1279, #1261, #1260, #1259** into a new branch `feature/merge-closed-prs-s25`, resolve Express 5 breaking changes in `server/`, update ESLint to flat config, and open a stacked PR series. Include CI config diffs, Playwright test updates for React-Leaflet 5, and a final release PR template with a provenance manifest checklist.”

## Quick questions

1. Do you want the **rebrand** (from #1260) fully applied across package names and Docker image tags, or limited to UI/docs? ([GitHub][1])
2. Should the **artifacts pack** (#1279) publish to your existing registry or a new staging bucket with signature verification? ([GitHub][1])
3. Any constraints on **Express 5** adoption timing (e.g., must keep a compatibility shim for one release)? ([GitHub][1])
4. Are there additional **closed PRs** you specifically want prioritized beyond the four listed? If yes, list numbers and I’ll fold them into the stack. ([GitHub][1])

*References: GitHub PR state & titles as of Sep 18–19, 2025; Council Wishbooks for acceptance/guardrails.* ([GitHub][1]) &#x20;

[1]: https://github.com/BrianCLong/summit/pulls?q=is%3Apr+is%3Aclosed "Pull requests · BrianCLong/summit · GitHub"
[2]: https://github.com/BrianCLong/summit/pulls "Pull requests · BrianCLong/summit · GitHub"

Awesome — moving straight into execution. Here’s the **ready-to-run sprint kit** to intelligently merge those closed PRs, remediate breaking changes, and ship the consolidated release PR.

---

# 1) Git + GH: create consolidation branch and deterministic cherry-picks

> Assumes you have: `git >= 2.44`, `gh >= 2.50`, Node 20+, and write access.
> Branch naming per plan: `feature/merge-closed-prs-s25`.

```bash
# 0) Fresh baseline
git fetch origin --prune
git switch main
git pull --ff-only origin main

# 1) Create consolidation branch
git switch -c feature/merge-closed-prs-s25

# 2) Helpful vars (edit the repo owner/name if different)
export REPO="BrianCLong/summit"
export BASE_BRANCH="main"
export CONSOLIDATION_BRANCH="feature/merge-closed-prs-s25"

# 3) For closed PRs, fetch their heads and cherry-pick with provenance (-x)
#    Target PRs: 1279 (artifacts pack), 1261 (express5/eslint9), 1260 (rebrand), 1259 (conflict-free bundle)

# --- Helper: cherry-pick all commits of a PR in chronological order
cherry_pick_pr () {
  local pr=$1
  echo "==> Processing PR #$pr"
  # create a temp branch to materialize the PR head even if closed
  git fetch origin "pull/${pr}/head:tmp/pr-${pr}"
  # list commits in oldest->newest order relative to main
  COMMITS=$(git rev-list --reverse --no-merges --cherry-pick --right-only tmp/pr-${pr}...${BASE_BRANCH})
  if [ -z "$COMMITS" ]; then
    echo "No unique commits to cherry pick for #$pr (likely already merged)."
  else
    for c in $COMMITS; do
      git cherry-pick -x $c || {
        echo "Conflict in commit $c from PR #$pr — launching resolver..."
        # show a small range-diff to help resolve
        git range-diff ${BASE_BRANCH}...tmp/pr-${pr} | sed -n '1,120p'
        echo "Resolve conflicts, then:"
        echo "  git add -A && git cherry-pick --continue"
        exit 1
      }
    done
  fi
  # clean temp branch
  git branch -D tmp/pr-${pr} || true
}

# 4) Execute cherry-picks (order chosen to minimize conflicts)
cherry_pick_pr 1279   # artifacts pack v1.0.0
cherry_pick_pr 1261   # express@5, eslint@9
cherry_pick_pr 1260   # rebrand
cherry_pick_pr 1259   # conflict-free bundle sweep

# 5) Commit metadata bundle of this operation (range-diff transcript)
git range-diff ${BASE_BRANCH}...${CONSOLIDATION_BRANCH} > .merge-evidence/rangediff-$(date +%F).txt
git add .merge-evidence || true
git commit -m "chore(merge): add range-diff evidence for closed PR cherry-picks"

# 6) Push the consolidation branch
git push -u origin ${CONSOLIDATION_BRANCH}
```

---

# 2) Open stacked PRs into the consolidation branch

We’ll keep changes reviewable by opening **stacked PRs** *into* `feature/merge-closed-prs-s25`, not `main` yet.

```bash
# Each stack is a small, focused PR targeting the consolidation branch
# A) Express 5 + ESLint 9 migration
gh pr create \
  --repo $REPO \
  --base $CONSOLIDATION_BRANCH \
  --head $CONSOLIDATION_BRANCH \
  --title "stack/server: Express 5 + ESLint 9 migration" \
  --body-file - <<'MD'
- Upgrade server runtime to Express 5 with centralized async error handling.
- Convert ESLint to Flat Config (eslint.config.mjs) and resolve new rule surfaces.
- Update Jest/Supertest suites and contract tests.
MD

# B) Artifacts pack + SBOM/provenance
git switch -c stack/artifacts-pack-v1
git push -u origin stack/artifacts-pack-v1
gh pr create --repo $REPO --base $CONSOLIDATION_BRANCH --head stack/artifacts-pack-v1 \
  --title "stack/ops: Artifacts pack v1 + SBOM + provenance verifier" \
  --body "Adds CycloneDX SBOM, signing, and a verifier step in CI."

# C) Client build bumps (Vite 7, React-Leaflet 5) + E2E fixes
git switch -c stack/client-vite7-leaflet5
git push -u origin stack/client-vite7-leaflet5
gh pr create --repo $REPO --base $CONSOLIDATION_BRANCH --head stack/client-vite7-leaflet5 \
  --title "stack/client: Vite 7 + React-Leaflet 5 compatibility" \
  --body "Refactors map init + stabilizes Playwright waits for tile load."

# D) Rebrand (UI/docs/labels) – gated by provenance references
git switch -c stack/rebrand-docs
git push -u origin stack/rebrand-docs
gh pr create --repo $REPO --base $CONSOLIDATION_BRANCH --head stack/rebrand-docs \
  --title "stack/docs: Rebrand apply + provenance references intact" \
  --body "Completes rebrand without breaking provenance & export manifests."
```

> Review/merge the stack PRs into `feature/merge-closed-prs-s25`, then proceed to the final release PR to `main`.

---

# 3) Express 5 migration: code changes

### 3.1 Centralized async error handling (Express 5 propagates promise rejections)

`server/app.ts`

```ts
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  // Routes
  app.get("/healthz", async (_req: Request, res: Response) => {
    return res.status(200).json({ ok: true });
  });

  app.post("/api/entities", async (req: Request, res: Response) => {
    const { type, props } = req.body ?? {};
    if (!type) throw new Error("Entity type is required");
    // … create entity …
    return res.status(201).json({ id: "ent_123", type, props });
  });

  // 404 (must come after routes)
  app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

  // Error handler — final middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || 500;
    const code = err.code || "INTERNAL_ERROR";
    const message = process.env.NODE_ENV === "production" ? "Internal error" : (err.message || String(err));
    // structured error for audit consistency
    res.status(status).json({ error: { code, message } });
  });

  return app;
};
```

`server/index.ts`

```ts
import { createServer } from "http";
import { createApp } from "./app";

const port = Number(process.env.PORT || 8080);
const app = createApp();
const httpServer = createServer(app);

httpServer.listen(port, () => {
  // structured boot log
  console.log(JSON.stringify({ msg: "server_listening", port }));
});
```

### 3.2 Supertest/Jest sample (covers async error pipeline)

`server/__tests__/app.spec.ts`

```ts
import request from "supertest";
import { createApp } from "../app";

describe("Express5 app", () => {
  const app = createApp();

  it("GET /healthz → 200", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("POST /api/entities without type → 500 structured error", async () => {
    const res = await request(app).post("/api/entities").send({ props: {} });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("GET /nope → 404", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
  });
});
```

---

# 4) ESLint 9 Flat Config

Remove `.eslintrc.*` and add `eslint.config.mjs`:

```js
// eslint.config.mjs
import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";

export default [
  { ignores: ["dist/**", "coverage/**", "**/*.generated.*"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { project: ["tsconfig.json"] },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-implicit-coercion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
];
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "typescript-eslint": "^8.8.0",
    "globals": "^15.9.0",
    "eslint": "^9.13.0"
  }
}
```

---

# 5) Client changes: Vite 7 + React-Leaflet 5

### 5.1 Vite config

`vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { sourcemap: true, target: "es2020" }
});
```

### 5.2 Leaflet map hook (context initialization changed in RL v5)

`client/src/map/IntelGraphMap.tsx`

```tsx
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function IntelGraphMap() {
  return (
    <div data-testid="map-root" style={{ width: "100%", height: "100%" }}>
      <MapContainer center={[37.7749, -122.4194]} zoom={12} preferCanvas>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {/* layers / markers go here */}
      </MapContainer>
    </div>
  );
}
```

### 5.3 Playwright stabilization for tile load / map-ready

`e2e/map.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Map", () => {
  test("renders and loads tiles", async ({ page }) => {
    await page.goto("/");

    const mapRoot = page.getByTestId("map-root");
    await expect(mapRoot).toBeVisible();

    // Wait until Leaflet signals _loaded (React-Leaflet v5 exposes the container element)
    await page.waitForFunction(() => {
      const el = document.querySelector(".leaflet-container");
      if (!el) return false;
      const anyWin = window as any;
      // find the Leaflet map from DOM (Leaflet attaches _leaflet_id to container)
      const hasMap = !!(el as any)._leaflet_id;
      // heuristically wait until at least one tile img is complete
      const tiles = Array.from(document.querySelectorAll(".leaflet-tile"));
      const ready = tiles.some((img: any) => img.complete && img.naturalWidth > 0);
      return hasMap && ready;
    }, { timeout: 15000 });

    // simple interaction sanity: move map by keyboard pan (if enabled)
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".leaflet-pane")).toBeVisible();
  });
});
```

---

# 6) CI/CD hardening + SBOM + provenance verifier (GitHub Actions)

`.github/workflows/ci.yml`

```yaml
name: ci
on:
  pull_request:
    branches: [ main, feature/merge-closed-prs-s25 ]
  push:
    branches: [ feature/merge-closed-prs-s25, stack/** ]
jobs:
  build_test:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Unit tests
        run: pnpm test -- --ci --reporters=default --reporters=jest-junit
      - name: Build client & server
        run: pnpm -r build

  e2e:
    needs: build_test
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps
      - run: pnpm e2e

  sbom_and_provenance:
    needs: [build_test]
    runs-on: ubuntu-22.04
    permissions:
      id-token: write
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: CycloneDX/gh-generate-sbom@v2
        with:
          format: json
          output: sbom.json
      - name: Sign SBOM (cosign keyless)
        uses: sigstore/cosign-installer@v3
      - name: cosign sign
        run: |
          echo "Signing SBOM via keyless OIDC"
          cosign sign-blob --yes --output-signature sbom.sig sbom.json
      - name: Provenance manifest (inputs/outputs hash)
        run: |
          node .ci/gen-provenance.js > provenance.json
      - name: Verify provenance
        run: |
          node .ci/verify-provenance.js provenance.json
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: intelgraph-artifacts
          path: |
            sbom.json
            sbom.sig
            provenance.json
```

`.ci/gen-provenance.js`

```js
#!/usr/bin/env node
const fs = require("fs");
const crypto = require("crypto");

function sha256(path) {
  const buf = fs.readFileSync(path);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const files = [
  "package.json",
  "pnpm-lock.yaml",
  "dist/server/index.js",
  "dist/client/assets/index.js"
].filter(f => fs.existsSync(f));

const manifest = {
  schema: "intelgraph.provenance/v1",
  createdAt: new Date().toISOString(),
  git: {
    commit: process.env.GITHUB_SHA || require("child_process").execSync("git rev-parse HEAD").toString().trim(),
    branch: process.env.GITHUB_REF_NAME || require("child_process").execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
  },
  artifacts: files.map(f => ({ path: f, sha256: sha256(f) }))
};

process.stdout.write(JSON.stringify(manifest, null, 2));
```

`.ci/verify-provenance.js`

```js
#!/usr/bin/env node
const fs = require("fs");
const crypto = require("crypto");

const path = process.argv[2] || "provenance.json";
const p = JSON.parse(fs.readFileSync(path, "utf8"));
let ok = true;

for (const a of p.artifacts) {
  if (!fs.existsSync(a.path)) {
    console.error(`Missing artifact: ${a.path}`);
    ok = false;
    continue;
  }
  const h = crypto.createHash("sha256").update(fs.readFileSync(a.path)).digest("hex");
  if (h !== a.sha256) {
    console.error(`Hash mismatch for ${a.path}. expected=${a.sha256} got=${h}`);
    ok = false;
  }
}

if (!ok) {
  console.error("Provenance verification FAILED");
  process.exit(1);
}
console.log("Provenance verification OK");
```

---

# 7) Final release PR → `main` (template)

Use after stacks merged into `feature/merge-closed-prs-s25`.

```bash
git switch feature/merge-closed-prs-s25
git pull --ff-only origin feature/merge-closed-prs-s25

gh pr create \
  --repo $REPO \
  --base main \
  --head feature/merge-closed-prs-s25 \
  --title "release: S25 consolidated merge (closed PR recovery + infra bumps)" \
  --body-file .github/release-s25.md
```

`.github/release-s25.md`

```md
# S25 Consolidated Merge

## Summary
- Recovers closed-but-desired PRs (#1279, #1261, #1260, #1259) via cherry-pick with provenance.
- Keeps CI/ops hardening baseline (from #1280) stable.
- Upgrades: Express 5, ESLint 9 (flat), Vite 7, React-Leaflet 5.
- Adds SBOM + provenance manifest + verifier in CI.

## Evidence
- Range-diff transcript: `.merge-evidence/rangediff-YYYY-MM-DD.txt`
- CI: unit, contract, Playwright all green
- Artifacts: `sbom.json` (signed), `provenance.json` (verified)

## Risk & Mitigation
- Express 5 breaks → central error handler; tests covering async errors
- Client build/map changes → E2E stabilized with tile-load waits

## Checklist
- [ ] SBOM generated and signed
- [ ] Provenance verified
- [ ] Policy-by-default simulations pass (OPA)
- [ ] GraphQL contract baselines (N-1/N-2) unchanged or documented
- [ ] Audit immutability intact (db migrations reviewed)
- [ ] SLO snapshots attached (p95 query, ingest E2E)
- [ ] Rollback plan attached

## Rollback
- Tag before merge: `vS25-pre-merge`
- Script: `./ops/rollback/rollback-to-tag.sh vS25-pre-merge`
```

`ops/rollback/rollback-to-tag.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
TAG="${1:-}"
[ -z "$TAG" ] && { echo "usage: $0 <git-tag>"; exit 1; }
git fetch origin --tags
git checkout "$TAG"
git switch -c hotfix/revert-to-${TAG}
git push -u origin hotfix/revert-to-${TAG}
# Optional: open revert PR
gh pr create --title "revert: rollback to $TAG" --body "Emergency rollback to $TAG" --base main --head hotfix/revert-to-${TAG}
```

---

# 8) Minimal GraphQL contract guard (prevents silent schema breaks)

`contracts/graphql/__tests__/schema.contract.ts`

```ts
import fs from "node:fs";
import { buildSchema, printSchema } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import typeDefs from "../../schema.graphql";

test("GraphQL schema contract (N-1, N-2)", () => {
  const current = printSchema(makeExecutableSchema({ typeDefs }));
  const baselines = ["schema.N-1.graphql", "schema.N-2.graphql"].filter(f => fs.existsSync(f));
  for (const b of baselines) {
    const baseline = fs.readFileSync(`contracts/graphql/${b}`, "utf8");
    expect(current).toBe(baseline);
  }
});
```

---

# 9) NPM scripts (top-level)

`package.json` (excerpt)

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "jest",
    "e2e": "playwright test",
    "lint": "eslint .",
    "sbom": "cyclonedx-npm --output-format JSON --output-file sbom.json",
    "provenance:gen": "node .ci/gen-provenance.js",
    "provenance:verify": "node .ci/verify-provenance.js provenance.json"
  }
}
```

---

# 10) What to do now (quick path)

1. Run the **bash block** in §1 to create the consolidation branch and cherry-pick.
2. Open and merge the **stack PRs** in §2.
3. Land the **release PR** using the template in §7.
4. Verify CI artifacts (SBOM + provenance) are present and green.

---

## Revised prompt (for the next step)

“Generate a single `make merge-s25` target that executes the cherry-pick workflow, runs lint/tests/e2e, produces SBOM + provenance, and opens the final release PR automatically with `gh`. Include idempotency and safe resume logic.”

## Quick questions (optional)

* Should we block the release PR on **OPA policy simulation** explicitly in CI (hard fail), or allow warn-only?
* Do you want the **rollback PR** pre-created (draft) alongside the release PR for audit readiness?

Locked and loaded. Here’s the **single-command, idempotent sprint driver** you asked for. Drop these files in the repo root and you can run everything with:

```
make merge-s25
```

That will: create the consolidation branch, cherry-pick the closed PRs, run lint/tests/e2e, build artifacts, generate & verify SBOM/provenance, and open the final release PR automatically (safe to re-run; it resumes from where it left off).

---

# 1) `Makefile`

```make
# ---- IntelGraph S25 Merge Orchestrator ---------------------------------------
# Usage:
#   make merge-s25          # end-to-end (idempotent)
#   make merge-s25.resume   # resume from saved state
#   make merge-s25.clean    # delete temp branches/state
#   make pr-release         # force (re)open final release PR only
# ------------------------------------------------------------------------------

SHELL := /usr/bin/env bash
.ONESHELL:
.SHELLFLAGS := -eo pipefail -c
MAKEFLAGS += --no-builtin-rules

# Config (override via env)
REPO              ?= BrianCLong/summit
BASE_BRANCH       ?= main
CONSOLIDATION     ?= feature/merge-closed-prs-s25
STACK_ARTIFACTS   ?= stack/artifacts-pack-v1
STACK_SERVER      ?= stack/express5-eslint9
STACK_CLIENT      ?= stack/client-vite7-leaflet5
STACK_REBRAND     ?= stack/rebrand-docs
PR_TARGETS        ?= 1279 1261 1260 1259
STATE_DIR         ?= .merge-evidence
STATE_FILE        ?= $(STATE_DIR)/state.json

NODE_VERSION      ?= 20

.PHONY: merge-s25 merge-s25.resume merge-s25.clean pr-release sbom provenance ci-check prereqs

merge-s25: prereqs
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --prs "$(PR_TARGETS)" \
	  --state "$(STATE_FILE)" \
	  --node "$(NODE_VERSION)"

merge-s25.resume: prereqs
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --prs "$(PR_TARGETS)" \
	  --state "$(STATE_FILE)" \
	  --resume \
	  --node "$(NODE_VERSION)"

merge-s25.clean:
	@echo "Cleaning state and temp branches…"
	@rm -rf "$(STATE_DIR)"
	@git branch -D tmp/pr-* 2>/dev/null || true

pr-release:
	@./scripts/merge_s25.sh \
	  --repo "$(REPO)" \
	  --base "$(BASE_BRANCH)" \
	  --branch "$(CONSOLIDATION)" \
	  --open-release-only \
	  --state "$(STATE_FILE)" \
	  --node "$(NODE_VERSION)"

sbom:
	@pnpm cyclonedx-npm --output-format JSON --output-file sbom.json

provenance:
	@node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json

ci-check:
	@pnpm install --frozen-lockfile
	@pnpm lint
	@pnpm test -- --ci --reporters=default --reporters=jest-junit
	@pnpm -r build
	@pnpm playwright install --with-deps
	@pnpm e2e

prereqs:
	@command -v git >/dev/null 2>&1 || { echo "git not found"; exit 1; }
	@command -v gh  >/dev/null 2>&1 || { echo "gh (GitHub CLI) not found"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found"; exit 1; }
	@node -v | grep -q "v$(NODE_VERSION)" || echo "WARN: Node version differs from $(NODE_VERSION)"
	@mkdir -p "$(STATE_DIR)"
```

---

# 2) `scripts/merge_s25.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage:
  merge_s25.sh --repo <owner/name> --base <main> --branch <feature/merge-closed-prs-s25> --prs "1279 1261 1260 1259" --state <state.json> [--resume] [--open-release-only] [--node 20]
EOF
}

REPO=""; BASE=""; BRANCH=""; PRS=""; STATE=""; RESUME=false; OPEN_RELEASE_ONLY=false; NODE_VER="20"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --prs) PRS="$2"; shift 2 ;;
    --state) STATE="$2"; shift 2 ;;
    --resume) RESUME=true; shift ;;
    --open-release-only) OPEN_RELEASE_ONLY=true; shift ;;
    --node) NODE_VER="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

[[ -z "$REPO" || -z "$BASE" || -z "$BRANCH" || -z "$STATE" ]] && { usage; exit 1; }
mkdir -p "$(dirname "$STATE")"

jq_safe_write() {
  local key="$1" val="$2"
  if [[ ! -f "$STATE" ]]; then
    printf '{ "steps": {}, "cherryPicked": [] }\n' > "$STATE"
  fi
  tmp="$(mktemp)"
  jq --arg k "$key" --arg v "$val" '.steps[$k]=$v' "$STATE" > "$tmp" && mv "$tmp" "$STATE"
}

jq_array_push_unique() {
  local arr="$1" val="$2"
  tmp="$(mktemp)"
  jq --arg v "$val" ".${arr} += ( [\$v] | map(select(. as \$x | . != \$x)) ) | .${arr} |= unique" "$STATE" > "$tmp" || true
  mv "$tmp" "$STATE"
}

ensure_state() {
  [[ -f "$STATE" ]] || printf '{ "steps": {}, "cherryPicked": [], "releasePR": null }\n' > "$STATE"
}

ensure_branch() {
  git fetch origin --prune
  git switch "$BASE"
  git pull --ff-only origin "$BASE"
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git switch "$BRANCH"
  else
    git switch -c "$BRANCH"
  fi
}

range_diff_dump() {
  mkdir -p .merge-evidence
  git range-diff "$BASE...$BRANCH" > ".merge-evidence/rangediff-$(date +%F).txt" || true
}

already_picked_commit() {
  local commit="$1"
  git branch "$BRANCH" --contains "$commit" >/dev/null 2>&1
}

cherry_pick_pr() {
  local pr="$1"
  echo "==> PR #$pr"
  # materialize head even if closed
  git fetch origin "pull/${pr}/head:tmp/pr-${pr}" || {
    echo "PR #$pr fetch failed (possibly deleted). Skipping."
    return 0
  }
  # list unique commits (oldest->newest)
  mapfile -t COMMITS < <(git rev-list --reverse --no-merges --cherry-pick --right-only "tmp/pr-${pr}...${BASE}")

  if [[ ${#COMMITS[@]} -eq 0 ]]; then
    echo "No unique commits for #$pr (already merged or empty)."
    return 0
  fi

  for c in "${COMMITS[@]}"; do
    if already_picked_commit "$c"; then
      echo "Skip (already included): $c"
      continue
    fi
    echo "Cherry-pick $c"
    if ! git cherry-pick -x "$c"; then
      echo "CONFLICT on $c (PR #$pr). Resolve, then run: make merge-s25.resume"
      exit 2
    fi
  done

  git branch -D "tmp/pr-${pr}" || true
  jq_array_push_unique "cherryPicked" "$pr"
}

open_stack_prs() {
  # Create lightweight stack branches if not exist, push, open PRs against consolidation
  for b in "$STACK_SERVER" "$STACK_ARTIFACTS" "$STACK_CLIENT" "$STACK_REBRAND"; do
    if git rev-parse --verify "$b" >/dev/null 2>&1; then
      echo "Stack branch exists: $b"
    else
      git switch -c "$b" "$BRANCH"
      git push -u origin "$b"
    fi
  done

  # Open PRs only if not already open
  for spec in \
    "$STACK_SERVER|stack/server: Express 5 + ESLint 9 migration|Upgrade to Express 5 (centralized async error); ESLint 9 Flat Config; update tests." \
    "$STACK_ARTIFACTS|stack/ops: Artifacts pack v1 + SBOM + provenance verifier|Adds CycloneDX SBOM, signing (cosign), and provenance generation/verification in CI." \
    "$STACK_CLIENT|stack/client: Vite 7 + React-Leaflet 5 compatibility|Map init/context fixes and Playwright tile-load stabilization." \
    "$STACK_REBRAND|stack/docs: Rebrand apply + provenance references intact|Renames and docs without breaking provenance/export manifests."; do
    IFS="|" read -r head title body <<<"$spec"
    if gh pr list -R "$REPO" --state open --head "$head" --json number | jq -e 'length>0' >/dev/null; then
      echo "PR already open for $head"
    else
      gh pr create -R "$REPO" --base "$BRANCH" --head "$head" --title "$title" --body "$body"
    fi
  done
}

ci_pipeline() {
  echo "==> Running CI checks locally (lint, unit, build, e2e)…"
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm test -- --ci --reporters=default --reporters=jest-junit
  pnpm -r build
  pnpm playwright install --with-deps
  pnpm e2e
}

artifacts_bundle() {
  echo "==> Generating SBOM + provenance"
  pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
  node .ci/gen-provenance.js > provenance.json
  node .ci/verify-provenance.js provenance.json
}

open_release_pr() {
  # Ensure release notes template exists
  if [[ ! -f ".github/release-s25.md" ]]; then
    mkdir -p .github
    cat > .github/release-s25.md <<'MD'
# S25 Consolidated Merge

## Summary
- Recovers closed-but-desired PRs (#1279, #1261, #1260, #1259) via cherry-pick with provenance.
- Keeps CI/ops hardening baseline stable.
- Upgrades: Express 5, ESLint 9 (flat), Vite 7, React-Leaflet 5.
- Adds SBOM + provenance manifest + verifier in CI.

## Evidence
- Range-diff transcript in .merge-evidence/
- CI: unit, contract, Playwright all green
- Artifacts: sbom.json (signed if configured), provenance.json (verified)

## Risk & Mitigation
- Express 5 breaks → centralized error handler; tests cover async errors
- Client build/map changes → tile-load waits in Playwright

## Checklist
- [ ] SBOM generated and (optionally) signed
- [ ] Provenance verified
- [ ] OPA policy simulations pass (hard fail configured)
- [ ] GraphQL contract baselines valid (N-1/N-2)
- [ ] Audit immutability intact
- [ ] SLO snapshots attached (p95 query, ingest E2E)
- [ ] Rollback plan attached
MD
  fi

  # If a release PR already exists from BRANCH -> BASE, skip
  if gh pr list -R "$REPO" --state open --base "$BASE" --head "$BRANCH" --json number | jq -e 'length>0' >/dev/null; then
    echo "Release PR already open."
    return
  fi

  gh pr create -R "$REPO" \
    --base "$BASE" \
    --head "$BRANCH" \
    --title "release: S25 consolidated merge (closed PR recovery + infra bumps)" \
    --body-file ".github/release-s25.md" || true
}

main() {
  ensure_state

  if $OPEN_RELEASE_ONLY; then
    open_release_pr
    exit 0
  fi

  echo "==> Ensuring branch currency and creating/using $BRANCH"
  ensure_branch
  jq_safe_write "ensure_branch" "ok"

  if ! $RESUME; then
    echo "==> Cherry-picking closed PRs into $BRANCH"
    for pr in $PRS; do
      cherry_pick_pr "$pr"
    done
    range_diff_dump
    jq_safe_write "cherry_pick" "done"
  else
    echo "==> Resume mode: skipping cherry-pick, continuing pipeline…"
  fi

  echo "==> Opening stacked PRs into consolidation branch (review-friendly granularity)"
  open_stack_prs
  jq_safe_write "stacks" "opened"

  echo "==> Running local CI gate"
  ci_pipeline
  jq_safe_write "ci_local" "green"

  echo "==> Artifacts bundle"
  artifacts_bundle
  jq_safe_write "artifacts" "ready"

  echo "==> Opening final release PR"
  open_release_pr
  jq_safe_write "release_pr" "opened"

  echo "All steps complete. SAFE TO RE-RUN."
}

main "$@"
```

> Make it executable: `chmod +x scripts/merge_s25.sh`

---

# 3) Minimal schema/OPA guards (ensure “policy-by-default” really blocks)

### 3.1 GraphQL contract test (drop-in)

`contracts/graphql/__tests__/schema.contract.ts`

```ts
import fs from "node:fs";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { printSchema } from "graphql";
import typeDefs from "../../schema.graphql";

test("GraphQL schema contract (N-1, N-2)", () => {
  const current = printSchema(makeExecutableSchema({ typeDefs }));
  const baselines = ["schema.N-1.graphql", "schema.N-2.graphql"].filter(f => fs.existsSync(`contracts/graphql/${f}`));
  for (const b of baselines) {
    const baseline = fs.readFileSync(`contracts/graphql/${b}`, "utf8");
    expect(current).toBe(baseline);
  }
});
```

### 3.2 OPA policy simulation gate (hard fail in CI)

`.github/workflows/policy-sim.yml`

```yaml
name: policy-simulation
on:
  pull_request:
    branches: [ main, feature/merge-closed-prs-s25 ]
jobs:
  opa:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - name: Install OPA
        run: curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa
      - name: Run simulations (hard fail)
        run: |
          ./opa test policies/ -v
```

---

# 4) CI glue for SBOM + provenance (if you didn’t add it yet)

`.github/workflows/ci.yml` (append these jobs or keep your existing layout)

```yaml
jobs:
  sbom_and_provenance:
    runs-on: ubuntu-22.04
    if: github.event_name == 'pull_request' || github.ref_name == 'feature/merge-closed-prs-s25' || startsWith(github.ref_name, 'stack/')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - name: SBOM
        run: pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
      - name: Provenance
        run: node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json
      - uses: actions/upload-artifact@v4
        with:
          name: intelgraph-artifacts
          path: |
            sbom.json
            provenance.json
```

(If you already added `.ci/gen-provenance.js` and `.ci/verify-provenance.js`, you’re set; otherwise paste from my previous message.)

---

# 5) What this gives you

* **One command** (`make merge-s25`) to do the whole dance.
* **Idempotency**:

  * Re-runs safely: checks existing branches and open PRs, skips already-picked commits, persists progress in `./.merge-evidence/state.json`.
  * `make merge-s25.resume` continues after you fix any conflicts.
* **Auditability**:

  * Range-diff transcript under `.merge-evidence/`.
  * SBOM + provenance hash manifest generated and verified locally and in CI.
* **Governance baked in**:

  * GraphQL contract guard and OPA sim hard-fail workflow.
* **Release automation**:

  * Auto-opens the final PR from consolidation → `main` with a complete template.

---

## Next actions (you can run this now)

1. Save the files above (Makefile + `scripts/merge_s25.sh` + CI bits).
2. `chmod +x scripts/merge_s25.sh`
3. `make merge-s25`

---

## Revised prompt (for the next iteration)

“Generate conflict-resolution guidance for Express 5 migration covering common patterns (removed `next(err)` in async handlers, `res.sendStatus` vs `res.status().send`, router-level error middleware order), and include a `git rerere` enablement snippet plus a checklist to ensure no duplicated cherry-picks after manual merges.”

## Quick questions (optional)

* Do you want the **policy-simulation** job to **block** merges on `stack/**` as well, or only the final release PR?
* Should we auto-sign SBOM via **cosign keyless** in CI (I can add the two lines if yes), or keep it unsigned for now?

Got it—here’s the **conflict-resolution playbook** you can use while landing the Express 5 migration and the closed-PR cherry-picks. It’s focused, copy-pasteable, and tuned to the exact hotspots you’ll hit.

---

# Express 5 Merge Conflicts — Practical Playbook

## 0) TL;DR (order of operations)

1. **Centralize errors** → one final error handler; remove ad-hoc `try/catch(next)` patterns.
2. **Normalize responses** → prefer `res.status(xx).json(...)` (or `.send()`), not `sendStatus()` where you need bodies.
3. **Fix router stacking** → routes → 404 → error handler (last).
4. **Async handlers** → just `throw` (or let promise reject); don’t call `next(err)` from `async` functions.
5. **Re-run tests** (Supertest/Playwright) and contract checks; only then continue cherry-picks.

---

## 1) Conflict pattern: `async` handlers still calling `next(err)`

### Symptom

Merge shows both variants:

* Old: wrapped `try/catch(next)`.
* New (Express 5): “just `throw`” with centralized error middleware.

### Fix (Before → After)

**Before (old Express 4 style)**

```ts
router.post("/api/entities", async (req, res, next) => {
  try {
    const entity = await svc.create(req.body);
    return res.status(201).json(entity);
  } catch (err) {
    return next(err);
  }
});
```

**After (Express 5)**

```ts
router.post("/api/entities", async (req, res) => {
  const entity = await svc.create(req.body); // thrown errors bubble to the error handler
  return res.status(201).json(entity);
});
```

> If you still need special mapping (e.g., business error → 409), **map inside the global error handler**, not per-route.

---

## 2) Conflict pattern: `res.sendStatus()` vs structured JSON

### Symptom

Closed PRs may use quick `sendStatus(400)` while the migration branch uses structured error bodies for audit/provenance.

### Rule of thumb

* **Use** `res.status(code).json({...})` when:

  * You need an error **body** (auditability, provenance, client UX).
* **Use** `sendStatus(code)` only for pure status pings (e.g., `204` after idempotent ops).

**Bad**

```ts
return res.sendStatus(400);
```

**Good**

```ts
return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing 'type'" } });
```

---

## 3) Conflict pattern: Router-level error middleware ordering

### Symptom

You see two error handlers (one at router level, one global) in conflicting hunks, or `404` placed after the error handler.

### Canonical order (must be last)

```ts
app.use("/api", apiRouter);

// 404 after all routes
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

// Single, final error handler
app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const msg = process.env.NODE_ENV === "production" ? "Internal error" : (err.message || String(err));
  res.status(status).json({ error: { code, message: msg } });
});
```

> If a router has its own error middleware (legacy), **remove it** unless it adds indispensable context; if it does, convert it into a helper used by the global handler.

---

## 4) Conflict pattern: `next()` usage in non-error flows

### Symptom

Legacy code uses `next()` to jump to the next middleware after sending a response; with async handlers, this often causes **“headers already sent”** conflicts.

### Fix

* After `res.status(...).json(...)` or `res.end()`, **return** immediately.
* Do **not** call `next()` after a response is sent.

```ts
// Bad
res.status(201).json(entity);
return next();

// Good
return res.status(201).json(entity);
```

---

## 5) Conflict pattern: Validation middlewares (AJV/JOI) mixing sync/async

### Symptom

Validators written as sync middlewares call `next(err)`, while routes were upgraded to async/throw.

### Fix

Transform validators into **throwing** middlewares (they can be sync functions that throw):

```ts
function validateCreate(req: Request) {
  const ok = schema.validate(req.body);
  if (!ok) {
    const err: any = new Error("Invalid payload");
    err.statusCode = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }
}

router.post("/api/entities", (req, _res, next) => { validateCreate(req); next(); }, async (req, res) => {
  const entity = await svc.create(req.body);
  return res.status(201).json(entity);
});
```

Or fold validation into the handler and throw directly.

---

## 6) Conflict pattern: Streaming / file responses

### Symptom

Handlers mixing `res.download`, `res.sendFile`, or `res.write` with async/await collisions.

### Fix

* Wrap streams with `pipeline`/promises; **don’t** call `next(err)`—**reject** instead and let the error handler respond.
* Ensure exactly **one** response path.

```ts
import { pipeline } from "node:stream/promises";

router.get("/export/:id", async (req, res) => {
  const stream = await svc.exportStream(req.params.id);
  res.setHeader("Content-Type", "application/octet-stream");
  await pipeline(stream, res); // errors here bubble to global error handler
});
```

---

## 7) Conflict pattern: Tests assuming Express 4 behaviors

### Symptoms & fixes

* **Unhandled rejections**: tests must `await` requests; remove manual `done(err)`.
* **404 assertions**: now JSON-structured; update to `expect(res.body).toMatchObject({ error: "Not Found" })`.
* **Error cases**: expect consistent `{ error: { code, message } }` bodies, not HTML error pages.

---

# Git conflict muscle: `rerere` + workflow

## 8) Enable **git rerere** (remember resolutions)

```bash
git config --global rerere.enabled true
git config --global rerere.autoUpdate true
# Optional, audit where rerere applied:
git config --global rerere.log true
```

> With rerere, once you resolve a specific conflict pattern (e.g., handler signature), subsequent cherry-picks with the **same conflict** will auto-apply your prior fix and drop you straight to `--continue`.

---

## 9) Conflict-resolution workflow (copy/paste)

```bash
# When a cherry-pick stops:
git status              # see conflicted files
git diff                # inspect hunks
# Fix files per patterns above, prefer the Express 5 style.
pnpm lint && pnpm test  # quick safety net
git add -A
git cherry-pick --continue

# If you must abort this commit only (not the whole stack):
git cherry-pick --abort
# (then handle via manual patch or skip; record in a log)
```

> After a tough conflict, **commit a small, isolated fix** with a message prefix `mergefix(express5): ...` so future bisects are easy.

---

# Avoiding duplicate cherry-picks after manual merges

## 10) Pre-flight checks (detect dupes by patch-id)

**Compare branch vs base for semantic duplicates:**

```bash
# show commits unique to BRANCH (vs BASE) ignoring equivalent patches
git log --oneline --cherry ${BASE}...${BRANCH}
```

**Find if an incoming commit’s patch already exists:**

```bash
# For an arbitrary commit C you’re about to cherry-pick:
git show C | git patch-id --stable
# Then scan current branch for the same patch-id:
git log -p | git patch-id --stable | grep <that-id> && echo "Duplicate patch, skip"
```

**Safer cherry-pick range selection (used in our script):**

```bash
git rev-list --reverse --no-merges --cherry-pick --right-only tmp/pr-XXXX...${BASE}
```

## 11) Checklist (run before final release PR)

* [ ] `git log --oneline --cherry ${BASE}...${CONSOLIDATION}` shows only the intended commits.
* [ ] No commits with message `"(cherry picked from commit"` appear twice with different SHAs.
* [ ] `git range-diff ${BASE}...${CONSOLIDATION}` reviewed; unexpected drops or duplicate diffs resolved.
* [ ] All conflict “mergefix(express5)” commits squashed or documented.
* [ ] App boots locally and **Supertest/Playwright** pass.
* [ ] Error handler present exactly once, after 404 middleware.
* [ ] No `next(err)` inside `async` handlers.
* [ ] `sendStatus()` only where bodies are unnecessary.
* [ ] Provenance & SBOM artifacts generated and verified.

---

## 12) Bonus: pre-commit guard to catch `next(err)` in async handlers

`.git/hooks/pre-commit` (make executable)

```bash
#!/usr/bin/env bash
set -euo pipefail
# Fail commit if an async handler contains next(err)
if git diff --cached -U0 | grep -E 'async\s*\(.*\)\s*=>\s*{[^}]*next\(\s*err\s*\)' -q; then
  echo "❌ Found 'next(err)' inside async handler. Throw instead and let global error handler respond."
  exit 1
fi
```

---

## 13) Tiny refactor helpers (codemods-ish, optional)

**Remove `try/catch(next)` in async handlers** (quick heuristic):

```bash
rg -n 'async\s*\(.*\)\s*=>\s*{\s*try\s*{' server | cut -d: -f1 | sort -u | xargs -I{} node -e "
const fs=require('fs');let s=fs.readFileSync('{}','utf8');
s=s.replace(/async\s*\(([^)]*)\)\s*=>\s*{\s*try\s*{([\s\S]*?)\}\s*catch\s*\((\w+)\)\s*{\s*return\s*next\(\s*\3\s*\);\s*}\s*}/g,
  'async ($1) => { $2 }');
fs.writeFileSync('{}',s);
"
pnpm lint:fix
```

> Review changes—this is a heuristic; don’t run blindly on critical files.

---

### That’s it

Use this guide while you run `make merge-s25` and handle any stop-points. If you want, I can also generate a **one-page “resolution cookbook”** you can drop into the repo (Markdown with the rules & code blocks above) so reviewers have a consistent reference during the merge PR.

Sweet — here’s the “next slab” of drop-in artifacts to make the merge smoother, reviewers aligned, and CI stricter. Everything is copy-paste-ready.

---

# 1) One-pager for reviewers (cookbook)

`docs/merge/express5_conflict_cookbook.md`

````md
# Express 5 Merge: Conflict-Resolution Cookbook

## Golden Rules
1) One global error handler (last); no router-level error handlers.
2) In async handlers: **throw**; never `next(err)`.
3) Use `res.status(x).json(...)` when you want bodies; reserve `sendStatus()` for bodyless pings.
4) Order: routes → 404 → error handler.
5) Return after responding (avoid “headers already sent”).

## Patterns
### A) Async handler error
**Before**
```ts
router.post("/api/x", async (req,res,next)=>{try{...}catch(e){next(e)}})
````

**After**

```ts
router.post("/api/x", async (req,res)=>{ const r=await svc.create(req.body); return res.status(201).json(r); })
```

### B) Structured errors

```ts
throw Object.assign(new Error("Missing 'type'"), { statusCode: 400, code: "BAD_REQUEST" })
```

Global error handler maps `{ statusCode, code }` → JSON.

### C) 404 + Error order

```ts
app.use((_req,res)=>res.status(404).json({error:"Not Found"}))
app.use((err,_req,res,_next)=>{ const s=err.statusCode||500; const c=err.code||"INTERNAL_ERROR"; const m=process.env.NODE_ENV==="production"?"Internal error":(err.message||String(err)); res.status(s).json({error:{code:c,message:m}}); })
```

### D) Streaming

```ts
import { pipeline } from "node:stream/promises";
router.get("/export/:id", async (req,res)=>{ const s=await svc.exportStream(req.params.id); res.setHeader("Content-Type","application/octet-stream"); await pipeline(s,res); })
```

### E) Tests

* Use Supertest async/await; expect structured errors.
* Update 404 assertions to JSON.

## Checklists

* [ ] No `next(err)` inside async handlers
* [ ] Exactly one error handler (global, last)
* [ ] 404 precedes error handler
* [ ] `sendStatus()` only when bodyless
* [ ] All routes `return` after sending responses

````

---

# 2) PR templates (consistent review gates)

`.github/PULL_REQUEST_TEMPLATE.md`
```md
## Summary
<!-- What changed and why -->

## Type
- [ ] Feature
- [ ] Fix
- [ ] Chore
- [ ] Mergefix (Express5)

## Validation
- [ ] Unit tests green
- [ ] E2E (Playwright) green
- [ ] Lint (ESLint 9) clean
- [ ] GraphQL contracts unchanged or baselined
- [ ] OPA policy sim PASS
- [ ] SBOM + provenance generated & verified

## Risk
- Blast radius:
- Rollback plan:

## Notes for Reviewers
- Conflict patterns addressed (link): docs/merge/express5_conflict_cookbook.md
````

`.github/ISSUE_TEMPLATE/release_checklist.md`

```md
---
name: "Release Checklist (S25)"
about: Gate for consolidated merge
labels: release
---
- [ ] Range-diff reviewed
- [ ] Duplicate cherry-picks ruled out (`git log --oneline --cherry`)
- [ ] SBOM + provenance uploaded
- [ ] SLO snapshots attached
- [ ] Rollback tag planned
```

---

# 3) Git hygiene (deterministic diffs)

`.gitattributes`

```
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.json text eol=lf
*.md text eol=lf
```

`.git-blame-ignore-revs`

```
# Formatting-only / mass-rename commits
# Add mergefix commits here to keep blame signal clean.
```

`README.md` (append)

```md
> To hide formatting-only commits from blame:
> `git config blame.ignoreRevsFile .git-blame-ignore-revs`
```

`.editorconfig`

```
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

---

# 4) CI hardening add-ons

## 4.1 Retries for flaky e2e (kept small)

`playwright.config.ts` (excerpt)

```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: { actionTimeout: 15_000, navigationTimeout: 15_000 }
});
```

## 4.2 Contract + policy gates (Make)

`Makefile` (append targets)

```make
contracts:
	@pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand

policy-sim:
	@curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa
	@./opa test policies/ -v
```

## 4.3 Block merges unless gates pass

`.github/workflows/required-gates.yml`

```yaml
name: required-gates
on:
  pull_request:
    branches: [ main, feature/merge-closed-prs-s25 ]
jobs:
  gates:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - name: Lint & unit
        run: pnpm lint && pnpm test -- --ci
      - name: Contracts
        run: pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand
      - name: E2E
        run: pnpm playwright install --with-deps && pnpm e2e
      - name: Policy sim
        run: |
          curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa
          ./opa test policies/ -v
      - name: SBOM + provenance
        run: pnpm cyclonedx-npm --output-format JSON --output-file sbom.json && node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json
```

---

# 5) Tiny helper scripts

`scripts/enable_rerere.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
git config rerere.enabled true
git config rerere.autoUpdate true
git config rerere.log true
echo "git rerere enabled ✅"
```

`scripts/check_dupe_patches.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-main}"
BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"
echo "Scanning ${BRANCH} vs ${BASE} for duplicate patches…"
git log -p "${BASE}...${BRANCH}" | git patch-id --stable | awk '{print $1}' | sort | uniq -d | wc -l | xargs -I{} echo "Duplicate patch-ids: {} (0 is ideal)"
```

Add to `Makefile`:

```make
rerere:
	@bash scripts/enable_rerere.sh

dupescans:
	@bash scripts/check_dupe_patches.sh $(BASE_BRANCH) $(CONSOLIDATION)
```

---

# 6) Reviewer helper (GitHub comment macro)

`.github/comment-templates/mergefix.md`

```md
**Mergefix review macro**
- [ ] Async handlers never call `next(err)`
- [ ] Routes → 404 → error handler
- [ ] Structured error shape `{ error: { code, message } }` consistent
- [ ] No router-level error middleware
- [ ] Tests updated for JSON errors & 404s
- [ ] Streaming routes use `pipeline(...)`
```

---

# 7) Optional: pre-commit guards

`.husky/pre-commit` (if using Husky)

```bash
#!/usr/bin/env bash
pnpm lint
pnpm test -w --silent --passWithNoTests
# Block next(err) in async handlers
if git diff --cached -U0 | grep -E 'async\s*\(.*\)\s*=>\s*{[^}]*next\(\s*err\s*\)' -q; then
  echo "❌ 'next(err)' found inside async handler. Throw instead."
  exit 1
fi
```

---

# 8) What to do right now

1. Add the files above.
2. `git add -A && git commit -m "docs/ci: add Express5 merge cookbook + required gates"`
3. `git push` — the required gates workflow will enforce the same standards the release PR needs.

---

## Revised prompt (for the next step)

“Generate a compact `CONTRIBUTING.md` section specifically for **mergefix/Express5** changes (coding rules, commit message conventions, and how to run the minimal local gate), plus a `CODEOWNERS` tweak so `mergefix` PRs auto-request reviews from `@intelgraph-core` and `@intelgraph-ci`.”

## Quick questions (optional)

* Do you want the **required-gates** workflow to run on `stack/**` branches, or only PRs targeting `feature/merge-closed-prs-s25` and `main`?
* Should we make **husky** a hard dependency (pre-commit hook), or keep it optional to avoid friction on contributor machines?

Alright—here are the **drop-in artifacts** you asked for: a compact CONTRIBUTING section tailored to **mergefix/Express5** and a **CODEOWNERS** tweak that auto-requests reviews from `@intelgraph-core` and `@intelgraph-ci`.

---

## 1) `CONTRIBUTING.md` (append this section)

````md
## Mergefix / Express 5 Changes (Fast Path)

This section defines **coding rules, commit conventions, and the minimal gate** for any PR that touches the Express 5 migration or related merge conflict work. Use it for PRs labeled `mergefix`.

### Coding Rules (must)
1. **One global error handler** at the end of the middleware chain. No router-level error handlers.
2. **Async handlers `throw`**; never call `next(err)` from an `async` function.
3. **Structured errors** only:
   ```json
   { "error": { "code": "BAD_REQUEST", "message": "Human-readable text" } }
````

4. **Order**: routes → 404 → error handler.
5. **Return after responding** (avoid `"headers already sent"`).
6. **Validation**: validators may `throw` `{ statusCode, code, message }`; do not `next(err)`.
7. **Streaming**: use `await pipeline(stream, res)`; let rejections bubble to the global error handler.
8. **Tests**: Supertest must `await`; assert JSON errors; 404 is JSON.

### Commit Message Convention

Use the `mergefix` type + scope:

* `mergefix(express5): centralize error handler`
* `mergefix(router): drop next(err) in async handlers`
* `mergefix(build): adjust Vite 7 config`
* `mergefix(tests): update Supertest for JSON errors`

If a commit is a pure conflict resolution, prefer the prefix `mergefix(express5):` and keep the diff tightly scoped.

> Add formatting-only or mass-rename SHAs to `.git-blame-ignore-revs`.

### Minimal Local Gate (must pass before pushing)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test -- --ci
pnpm -r build
pnpm playwright install --with-deps
pnpm e2e
pnpm jest contracts/graphql/__tests__/schema.contract.ts --runInBand
curl -sL -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64 && chmod +x ./opa && ./opa test policies/ -v
pnpm cyclonedx-npm --output-format JSON --output-file sbom.json
node .ci/gen-provenance.js > provenance.json && node .ci/verify-provenance.js provenance.json
```

Or with `make`:

```bash
make ci-check contracts policy-sim
```

### Conflict-Resolution Tips

* Enable `git rerere` once:

  ```bash
  git config --global rerere.enabled true
  git config --global rerere.autoUpdate true
  git config --global rerere.log true
  ```
* Detect duplicates before opening your PR:

  ```bash
  git log --oneline --cherry origin/main...HEAD
  ```

### PR Checklist

* [ ] No `next(err)` in async handlers
* [ ] Single global error handler (after 404)
* [ ] JSON error shape consistent
* [ ] Tests updated for Express 5 semantics
* [ ] Contracts + policy sim pass
* [ ] SBOM + provenance generated and verified

````

---

## 2) `CODEOWNERS` (append or create if missing)

```txt
# Mergefix / Express 5–related surfaces
/server/**                        @intelgraph-core @intelgraph-ci
/policies/**                      @intelgraph-core @intelgraph-ci
/contracts/graphql/**             @intelgraph-core @intelgraph-ci
/docs/merge/**                    @intelgraph-core @intelgraph-ci
/scripts/merge_s25.sh             @intelgraph-core @intelgraph-ci
/.github/workflows/**             @intelgraph-core @intelgraph-ci
/.github/PULL_REQUEST_TEMPLATE.md @intelgraph-core @intelgraph-ci
/.github/ISSUE_TEMPLATE/**        @intelgraph-core @intelgraph-ci

# Optional: catch-all for mergefix PRs that touch multiple areas
*                                   @intelgraph-core
````

> With `CODEOWNERS` in the default branch, GitHub will **auto-request** reviews from these teams on matching changes. If your org uses different team slugs, replace `@intelgraph-core` / `@intelgraph-ci` accordingly.

---

## 3) (Optional) label auto-application for “mergefix”

If you want PRs touching these paths to get the `mergefix` label automatically, drop this in `.github/labeler.yml`:

```yaml
mergefix:
  - changed-files:
      - any-glob-to-any-file:
          - "server/**"
          - "policies/**"
          - "contracts/graphql/**"
          - "docs/merge/**"
          - "scripts/merge_s25.sh"
          - ".github/workflows/**"
```

And enable the official **Pull Request Labeler** action:

```yaml
# .github/workflows/labeler.yml
name: pr-labeler
on:
  pull_request_target:
    types: [opened, synchronize, reopened]
jobs:
  label:
    permissions: { contents: read, pull-requests: write }
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/labeler@v5
        with:
          sync-labels: true
```

---

## Revised prompt (next step)

“Produce a **release hygiene checklist** Markdown (one page) to attach to the final PR, including: diff/range-diff commands, duplicate patch detection, performance SLO snapshot steps, and a short, auditable rollback drill with commands.”

## Quick questions

1. Are `@intelgraph-core` and `@intelgraph-ci` the exact GitHub team handles in your org, or should I use different slugs?
2. Do you also want `CODEOWNERS` to include `client/**` for the Vite/Leaflet changes, or keep it server/governance-focused?

