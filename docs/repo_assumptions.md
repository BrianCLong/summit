# Repo Assumptions & Verification

## 1.4 Repo Reality Check (what’s verified vs assumed)

### Verified (from public GitHub pages)

* `.github/workflows/` exists and includes multiple workflows beyond `ci.yml` (agentic evals, access review, docs validation, evidence). ([GitHub][2])
* `lane:bizdev` label URL exists. ([GitHub][1])
* Issues exist for Playwright/E2E and UX/accessibility. ([GitHub][3])
* Skills pack page states the vendored upstream path: `skills/vendor/vercel-labs-agent-skills/skills/react-best-practices/`. ([Skills.lc][4])

### ASSUMPTIONS (must validate before merging)

* Repo language layout (e.g., `frontend/`, `backend/`, `apps/`, `packages/`) and current Playwright config location.
* Existing authZ/audit-log tables and how “Investigations” are represented in code.
* Whether GitHub label creation/editing is automated already (scripts/bot).

### Validation checklist (before any PR is merged):

1. Confirm actual app structure (where Playwright lives, where UI lives).
2. Confirm feature-flag system (your repo even has a “flag wiring & guardrails” issue stub in search). ([GitHub][8])
3. Confirm evidence schema expectations and existing CI artifact conventions.

## 1.5 Minimal Winning Slice (MWS)

**MWS sentence:** “A new contributor (human or agent) can pick a GTM-scoped issue, apply the right labels/templates, run the golden-path example locally, and have CI enforce governance + accessibility + deterministic evidence outputs.”

### Exact acceptance tests (machine-verifiable)

1. `docs/labels.md` exists and matches `.github/labeler.yml` (or labels JSON) with a validation script.
2. `docs/levels/{foundation,agents,enterprise}.md` exist and cross-link to exactly one example each.
3. `scripts/ci/check-artifacts-contract.ts` (or `.py`) passes on CI and locally.
4. Playwright runs an `approval_gate.spec` that proves “no privileged action without approval”.
5. `pnpm test:a11y` (or equivalent) runs axe on 2–3 core routes and fails on new violations.
6. `scripts/metrics/gain_index_report.py` outputs deterministic `gain_index.report.json` (no timestamps, stable ordering).

[1]: https://github.com/BrianCLong/summit/labels/lane%3Abizdev?utm_source=chatgpt.com "Labels · BrianCLong/summit - GitHub"
[2]: https://github.com/BrianCLong/summit/actions/workflows/ci.yml?utm_source=chatgpt.com "CI · Workflow runs · BrianCLong/summit · GitHub"
[3]: https://github.com/BrianCLong/summit/issues/11176?utm_source=chatgpt.com "Create Playwright test: Investigation creation → Entity addition ..."
[4]: https://skills.lc/BrianCLong/summit/brianclong-summit-skills-react-best-practices-pack-skill-md?utm_source=chatgpt.com "react-best-practices-pack | Skills.lc - AI Agent Skills"
[8]: https://github.com/BrianCLong/summit/issues/11015?utm_source=chatgpt.com "Flag wiring & guardrails · Issue #11015 · BrianCLong/summit - GitHub"
