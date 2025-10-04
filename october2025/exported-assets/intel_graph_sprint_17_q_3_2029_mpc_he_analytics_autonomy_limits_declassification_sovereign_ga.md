# 🗡️ Council of Spies & Strategists — Sprint 17 Plan (Q3 2029)

> Opening: “Compute without seeing, act within bounds, retire secrets with proofs, and let sovereign stacks stand on their own.”

## Sprint Goal (14–21 days)
Unlock **privacy‑preserving analytics** across partners via **MPC/HE pilots**, formalize **Autonomy Limits** for multi‑party environments, deliver **Declassification & Public Archive** workflows with proofs, and ship **Sovereign Deployments GA** (air‑gap first). Preserve performance and audit guarantees.

---
## Scope & Deliverables

### 1) Privacy‑Preserving Analytics — MPC/HE (pilot)
- **MPC path (v0):** secure aggregation for counts/top‑k over disjoint Partner Spaces using MPC (3‑party honest‑majority) with DP guard.
- **HE path (v0):** CKKS‑based sum/avg on bounded numeric features; batching + scale management; result range proofs.
- **Planner:** choose MPC vs. HE vs. DP‑only based on query shape, partners, cost, and latency.

### 2) Autonomy Limits & Multi‑Party Guardrails (v1)
- **Cross‑org autonomy caps:** forbid autonomous actions that affect shared entities; require **multi‑sign approvals** (both orgs) with evidence.
- **Risk scoring:** elevate duty‑of‑care when data is cross‑labeled; cooldowns and quotas per treaty.
- **Audit federation:** joint audit bundle with signatures from all affected parties.

### 3) Declassification & Public Archive (v1)
- **Review queues:** policy + time‑based eligibility; redaction proposals; legal‑basis checks.
- **Public packager:** emits a **Public Archive Bundle** with hashes, manifests, watermarks, purpose statements, and a public verifier link.
- **Sunset mechanics:** auto‑schedule declass events; cryptographic erasure of withheld segments; proof of partial release.

### 4) Sovereign Deployments GA (v1)
- **Air‑gap baseline:** full Offline/Field Kit with delta‑signed sync, local KMS/HSM, and no external calls.
- **Sovereign policy packs:** region‑specific defaults (labels, warrants, residency); sealed redaction vaults.
- **Upgrade lane:** sneaker‑net update packages with signing/attestation; rollback runbooks; health beacons via one‑way mail.

### 5) Analyst Experience & Education (v1)
- **MPC/HE explainer UI:** shows what’s computed where, what stays encrypted, and the guarantees.
- **Autonomy limits coach:** explains why actions are blocked and how to request multi‑sign approval.
- **Declass studio:** guided redaction, rationale capture, and public‑proof preview.

### 6) Operability & SLOs (v5)
- **Crypto compute SLOs:** MPC/HE latency and success rates; fallback behavior.
- **Declass SLOs:** queue p95, redaction review time; public verifier uptime.
- **Sovereign health:** sync integrity rate, beacon check‑ins, update success.

---
## Acceptance Criteria
1. **MPC/HE**
   - MPC secure aggregate across two partners returns DP‑guarded counts/top‑k with no raw egress; HE sums/avgs validate against plaintext baselines within tolerance; planner selects cheapest compliant path.
2. **Autonomy Limits**
   - Autonomous actions on shared entities require two‑party approval; risk scoring raises thresholds; joint audit bundles produced and verifiable.
3. **Declassification**
   - A case reaches eligibility; redactions applied; **Public Archive Bundle** verifies on public site; withheld segments show erasure proofs.
4. **Sovereign GA**
   - Air‑gapped deployment completes install, runs tri‑pane + runbooks, and syncs via signed deltas; sneaker‑net update applies with attestation and rollback option.
5. **Analyst UX**
   - MPC/HE explanations render for executed queries; autonomy coach shows block reasons and approval path; declass studio completes end‑to‑end.
6. **SLOs**
   - MPC/HE latency within target on demo sizes; declass queue p95 under target; sovereign beacons meet heartbeat SLO.

---
## Backlog (Epics → Stories)
### EPIC CW — Privacy‑Preserving Analytics
- CW1. MPC secure aggregation
- CW2. HE sums/avgs + range proofs
- CW3. Planner + cost model

### EPIC CX — Autonomy Limits (Multi‑Party)
- CX1. Cross‑org action caps
- CX2. Multi‑sign approvals
- CX3. Joint audit bundles

### EPIC CY — Declassification & Public Archive
- CY1. Eligibility engine + queues
- CY2. Public packager + verifier link
- CY3. Partial release + erasure proofs

### EPIC CZ — Sovereign GA
- CZ1. Air‑gap kit + local KMS/HSM
- CZ2. Signed delta sync + beacons
- CZ3. Sneaker‑net updates + rollback

### EPIC DA — Analyst UX & Education
- DA1. MPC/HE explainer UI
- DA2. Autonomy coach
- DA3. Declass studio

### EPIC DB — Operability & SLOs v5
- DB1. Crypto compute SLOs
- DB2. Declass SLOs + verifier uptime
- DB3. Sovereign health beacons

---
## Definition of Done (Sprint 17)
- All ACs pass on two‑org staging and an air‑gapped pilot; security/ombuds sign‑off; docs updated (MPC/HE guide, autonomy limits, declass SOP, sovereign deployment manual); demo succeeds end‑to‑end.

---
## Demo Script
1. Run **MPC** top‑k across Partner A/B; results show DP guard; planner trace explains path.
2. Execute **HE** sum/avg; verify against plaintext job; range proofs pass.
3. Attempt an autonomous change on a shared entity; system blocks and routes to **multi‑sign**; joint audit bundle generated.
4. Declassify part of a case; publish **Public Archive Bundle**; verify publicly; display erasure proofs for withheld segments.
5. Set up **sovereign air‑gap**; run tri‑pane; sync via signed deltas; apply sneaker‑net update with attestation.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** MPC/HE architecture, sovereignty.
- **Crypto Eng (1):** HE/MPC libraries, range proofs.
- **Backend (2):** planner, autonomy limits, declass packager.
- **Frontend (2):** explainer UI, coach, declass studio.
- **Platform (1):** air‑gap sync, beacons, SLOs.
- **Security/Ombuds (0.5):** declass policy, multi‑sign governance.

---
## Risks & Mitigations
- **Crypto perf** → restrict to pilot ops; batch; fallback to DP‑only path with clear messaging.
- **Coordination friction** → streamlined multi‑sign flows; templates; SLAs.
- **Declass leakage** → layered redactions; verifier tests; public‑only proofs.
- **Air‑gap drift** → health beacons + signed deltas; rigorous update process.

---
## Metrics
- Crypto: ≥ 99% proof verifications; latency within target; zero raw egress.
- Autonomy: 0 unauthorized actions on shared entities; approval turnaround within SLA.
- Declass: 100% public bundles verifiable; 0 leaks; review p95 under target.
- Sovereign: 100% delta verify; update success ≥ 99%; heartbeat SLO met.

---
## Stretch (pull if we run hot)
- **MPC joins** for limited schemas.
- **HE min/max** with comparison protocols.
- **Public declass portal** index with search and per‑bundle proofs.

*Closing:* “Encrypt the math, bind the will, retire the secret, and keep the flag flying in sovereign wind.”

