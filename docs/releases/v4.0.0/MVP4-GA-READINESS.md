# MVP-4-GA (Ironclad Standard) Readiness Checklist

**Target Date**: TBD
**Decision Authority**: Release Captain + Council

---

## 1. The "Must-Have" Gates (No Exceptions)

### CI/CD

- [x] **Builds**: Clean, reproducible, deterministic (SLSA L3).
- [x] **Tests**: 100% Pass on `main` (Quarantine active).
- [x] **Security**: 0 High/Critical CVEs in containers (Syft/Trivy active).
- [x] **Lint**: 0 ESLint/Prettier errors.

### Reliability

- [x] **Smoke Test**: `make smoke` passes in clean env.
- [ ] **Performance**: P95 latency < 200ms for critical path (Pending Load Test).
- [x] **Drift**: No unchecked config drift (`PolicyWatcher` active).

### Governance

- [x] **Policy**: 100% Mutation coverage verified by audit.
- [x] **Evidence**: All release artifacts have provenance and signatures.

### Documentation

- [x] **API**: Accurate, up-to-date, example-driven.
- [x] **Runbooks**: All P0 alerts have a linked, tested runbook.

---

## 2. Promotion Decision Rubric

| Criteria           | GO   | CAUTION (Council Vote)     | NO GO                 |
| :----------------- | :--- | :------------------------- | :-------------------- |
| **Test Pass Rate** | 100% | >99% (Non-critical flakes) | <99%                  |
| **Critical Bugs**  | 0    | 0                          | >0                    |
| **High Bugs**      | 0    | <3 (Workaround exists)     | >3                    |
| **Security Risk**  | Low  | Low (Mitigated)            | High/Critical         |
| **Feature Gaps**   | None | Non-blocking/Cosmetic      | Core function missing |

---

## 3. Post-GA Monitoring (First 72 Hours)

**Hypercare Mode**:

- **On-Call**: 24/7 dedicated Release Captain.
- **Alert Thresholds**: Lowered by 50% (more sensitive).
- **Hourly Checks**:
  - Error Rate (Global)
  - Latency (P95, P99)
  - Saturation (CPU/Ram)
  - Business Metrics (Signups, Claims processed)

---

## 4. Sign-Offs

- [ ] **Product**: Features match spec.
- [ ] **Engineering**: System is stable/maintainable.
- [ ] **Security**: System is secure/compliant.
- [ ] **SRE**: System is operable/observable.
