# GA Release Plan

**Version**: 4.1.0 (GA)
**Generated**: 2026-01-04T20:00:00Z
**Marshal**: Claude Code GA Commander

## Command Map

| Action      | Command                          | Source       | Notes                                   |
| ----------- | -------------------------------- | ------------ | --------------------------------------- |
| Install     | `pnpm install --frozen-lockfile` | package.json | CI standard                             |
| Build       | `pnpm build` or `pnpm -r build`  | package.json | Builds client + server                  |
| Lint        | `pnpm lint`                      | package.json | ESLint + Ruff                           |
| Lint CJS    | `pnpm lint:cjs`                  | package.json | Verifies .cjs files use CommonJS syntax |
| Typecheck   | `pnpm typecheck`                 | package.json | TypeScript check                        |
| Unit Tests  | `pnpm test:unit`                 | package.json | Server unit tests                       |
| Integration | `pnpm test:integration`          | package.json | Integration tests                       |
| E2E         | `pnpm e2e`                       | package.json | Playwright tests                        |
| Smoke       | `make smoke`                     | Makefile     | Full stack smoke test                   |
| GA Gate     | `make ga`                        | Makefile     | Full GA verification                    |
| Preflight   | `make claude-preflight`          | Makefile     | Quick pre-GA checks                     |
| Format      | `pnpm format`                    | package.json | Prettier + Ruff                         |
| SBOM        | `make sbom`                      | Makefile     | CycloneDX generation                    |
| Provenance  | `make provenance`                | Makefile     | SLSA provenance                         |
| Release     | `pnpm release`                   | package.json | semantic-release                        |

## CI Workflows (Required Checks)

| Workflow        | File                 | Required | Notes                     |
| --------------- | -------------------- | -------- | ------------------------- |
| CI              | ci.yml               | Yes      | Lint + Test + Golden Path |
| GA Readiness    | ga-ready.yml         | Yes      | Security scans + GA gate  |
| SemVer Label    | semver-label.yml     | Yes      | Enforces version labels   |
| Governance      | governance-check.yml | Yes      | Policy compliance         |
| PR Quality Gate | pr-quality-gate.yml  | Yes      | PR standards              |
| IntelGraph CI   | intelgraph-ci.yml    | Yes      | Platform-specific tests   |

## GA Scope

### In Scope (GA-Eligible)

- Low-risk bugfixes
- Documentation improvements
- Infrastructure stability improvements
- Security patches
- Non-breaking features behind feature flags

### Out of Scope (Defer to Post-GA)

- Major refactors without coverage
- Breaking API changes
- Large dependency bumps
- New features without flag protection
- Experimental integrations

## PR Triage Summary

| Bucket               | Count | Criteria                      | Action                     |
| -------------------- | ----- | ----------------------------- | -------------------------- |
| A (Green + Low Risk) | TBD   | CI green, small change, safe  | Merge immediately          |
| B (Red but Fixable)  | TBD   | CI red but systemic issue     | Fix CI, then merge         |
| C (Conflicts)        | TBD   | Has merge conflicts           | Rebase, resolve, re-verify |
| D (High Risk)        | TBD   | Large change, breaking, risky | Defer to post-GA           |

## Merge Order

1. **Bucket A** - Merge immediately in order of risk (lowest first)
2. **Unblockers** - Land any systemic CI fixes
3. **Bucket B** - Re-run CI after unblockers, merge if green
4. **Bucket C** - Rebase onto latest main, resolve conflicts, re-verify
5. **Bucket D** - Defer with documented reasoning

## Known Risks

| Risk                           | Impact            | Mitigation              |
| ------------------------------ | ----------------- | ----------------------- |
| Supply chain workflow failures | CI noise          | Non-blocking, can defer |
| ESM/CJS module issues          | Test failures     | CJS guard in place      |
| Large deletion PRs             | Review complexity | Careful review          |

---

_Updated by GA Release Commander_
