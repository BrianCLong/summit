# Summit — GA Risk Gap Report (Jules)

**Mission:** Optimize for coverage and security alerts; minimal feature work; keep all merges clean and green.

## 1. Per-Repo Metrics
| Repository | Code Coverage | Critical Alerts | High Alerts | Status |
| :--- | :---: | :---: | :---: | :--- |
| `summit` (Monorepo) | TBD | TBD | TBD | 🔴 Verification Blocked |

## 2. GA Exit Criteria Checklist
- [ ] **Tests:** Local test execution (especially `server/`) is unblocked and functional.
- [ ] **Coverage:** Unit test coverage meets >= 80% thresholds and passes `pnpm coverage:gate`.
- [ ] **Security (SAST/DAST):** All high/critical static analysis findings are triaged or mitigated.
- [ ] **Security (Dependabot):** Zero new critical/high unmitigated Dependabot alerts.
- [ ] **CI Pipeline:** `ci-security.yml` and `ci.yml` consistently green on `main` and all release PRs.
- [ ] **Features:** No new unapproved feature work merged; scope strictly limited to stabilization.
- [ ] **Documentation:** README and quickstart guides reflect GA state.

## 3. Top 10 Residual Risks
1. **Broken Local Verification:** Developers cannot run tests locally, masking coverage regressions.
2. **Dependabot Alert Backlog:** Existing high/critical alerts require auditing and patching.
3. **...**
