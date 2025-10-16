# Summit / IntelGraph Copilot Playbook

## 1. Purpose

Maximize GitHub Copilot's value across development, operations, policy, and analysis layers of the Summit ecosystem. This playbook standardizes usage, improves security posture, and accelerates code generation and review cycles.

---

## 2. Core Configuration

| Setting      | Recommended Value                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| SKU          | **Copilot Enterprise**                                                                                |
| Org Policies | - Disable public code training<br>- Enable code referencing<br>- Enable PR summaries, Edits, and Chat |
| Editors      | VS Code, JetBrains, Neovim                                                                            |
| CLI          | `npm i -g @githubnext/copilot-cli` and run `copilot suggest`                                          |

---

## 3. Repository Hygiene

- Maintain `README.md` per package with clear usage examples.
- Keep `ARCHITECTURE.md` and `DECISIONS.md` (ADR log) up to date.
- Tag key files with ` @context:` comments (e.g. ` @context: opa`, ` @context: grafana`) to improve suggestion quality.

---

## 4. Golden Prompts

### Tests

/write-tests for file: packages/ai-core/src/router.ts using vitest + msw; cover error paths and OPA deny.

### Policy

/author OPA rego for dual-control delete with reason-for-access; include unit tests.

### K8s / Infra

/explain k8s manifests in ops/helm/values-prod.yaml and suggest KEDA autoscale rules for p95 latency.

### Grafana

/migrate this Grafana panel JSON to a library panel and add SLO burn-rate alerts.

### TypeScript

/extract component from src/ui/Dashboard.tsx into reusable widget with zod schema and prop typing.

---

## 5. PR Flow Integration

When opening a PR, use Copilot Chat to:

1. `/explain-changes`
2. `/generate-tests`
3. `/risk-callouts`
4. `/summarize-diff`

---

## 6. Scaffolds

Use the provided files in `scaffolds/` to seed new work:

- `opa-policy-stub.rego`
- `grafana-panel.json`
- `k8s-service-bundle.yaml`
- `ts-service-template.ts`

These give Copilot ideal patterns to learn from.

---

## 7. Measurement & Review

| Metric                     | Tool                       | Cadence    |
| -------------------------- | -------------------------- | ---------- |
| Suggestion acceptance rate | GitHub Copilot Metrics API | Weekly     |
| PR cycle time              | GitHub Actions Insight     | Weekly     |
| Unit test coverage         | Codecov                    | Per-commit |
| Lint/test/opa failures     | Fastlane                   | Continuous |

---

## 8. Rituals

- **Daily:** Start with `/triage my failing tests` or `/plan refactor for X in 3 steps`
- **Weekly:** 15-minute "Copilot wins & gotchas" share
- **Monthly:** Run `/list files with TODO/FIXME; group by owner and risk`
