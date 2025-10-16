## 🧠 Copilot Review Tasks

- [ ] `/explain-changes`
- [ ] `/generate-tests`
- [ ] `/risk-callouts`
- [ ] `/summarize-diff`

## ✅ Checklist

- [ ] Code compiles & passes CI
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] OPA policies verified
- [ ] Grafana dashboards updated if applicable

## Screenshots/Notes

### Pre-flight (guardrails)

- [ ] I ran `make doctor` locally (lint → typecheck → codegen drift → cycles)
- [ ] If UI/API touched: labeled `ui:smoke` or ran `make k6` locally
- [ ] If Helm/Terraform changed: added `ops:strict` label
- [ ] If perf-sensitive: added `perf:strict` label
- [ ] CI shows "unified-ci / build-test" + "CI (green) / green" ✅

---

**Context**
Describe what this change achieves and link related issues or ADRs.
