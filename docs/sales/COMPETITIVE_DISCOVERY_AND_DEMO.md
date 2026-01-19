# Competitive Discovery Script & Demo Storyboard

## Competitive discovery script (15 questions that force the “trust + governance” pain to surface)

Use these in order. They’re designed to make the buyer say “we can’t do that cleanly today” and reveal where we win.

### A. Automation trust (policy + approvals + “why”)

1. **When an automated action happens, can you show *who/what* initiated it, *why it was allowed*, and *what changed*—in one place?**
2. **Do you require approvals for high-risk actions (prod, IAM, billing, data export)? Are approvals tied to the actual execution record?**
3. **Can you simulate policy outcomes (“would allow/deny”) *before* running an action, and store that decision trace?**
4. **How do you prevent “agent/tool drift” (automation doing things outside of expected permissions) over time?**
5. **If an auditor asks “prove this action happened,” do you have cryptographically verifiable evidence, or screenshots/log scraping?**

### B. Cross-tool governance + lineage

6. **If I pick a business artifact (report, dashboard, customer export), can you show the full lineage across tools (source systems → transforms → consumers)?**
7. **Can a non-engineer answer “where did this number come from?” without pulling an engineer into a week-long investigation?**
8. **Can you answer “why does Alice have access?” with the exact attributes/rules that granted it—plus the evidence?**
9. **Do you have retention and deletion that is provable (what was deleted, when, under which policy)?**

### C. Reliability + operability of workflows

10. **Do you have a single ‘Runs’ view for long-running workflows with retries/compensation and step-by-step history?**
11. **What’s your stuck-run rate and mean time to recover? How do you detect and remediate stuck work?**
12. **Can you replay a workflow deterministically for audit/debug without “it depends on the state of external tools”?**

### D. Connectors + permission reality

13. **Which 5 tools are most critical to you, and which are “connector nightmares” (rate limits, permissions, vendor policy changes)?**
14. **Do you store copies of third-party data (chat/docs) long-term? If those vendors restrict indexing/retention, what breaks?**
15. **Can you attribute cost by tenant/team/service *to the action/workflow level* (not just cloud bill tags)?**

**Scoring tip:** if they answer “no” or “we cobble it together,” that’s our wedge. If they answer “ServiceNow does that,” follow with: “Can you prove it across *every* external system action with exportable evidence?”

---

## Demo storyboard (5 demos, 6–8 minutes each, each ends with a receipt export)

Each demo has the same spine: **Preflight → Approval → Execution → Evidence/Receipt Export**.

### Demo 1 — “High-risk action with ABAC preflight”

**Goal:** show automation that’s safe.
**Flow:**

* Search action catalog: “Grant temporary prod access”
* Show **ABAC simulation**: user attributes + environment = deny/allow reasoning
* Trigger approval request; approver sees rationale + risk level
* Execute; TTL auto-revokes
* **Export ActionRunReceipt** (policy decision + approvals + inputs redacted + outputs hashed)

**Win line:** “This is how you let AI/automation operate in prod without fear.”

---

### Demo 2 — “Workflow Runs UI: failure, retry, compensation”

**Goal:** show mission-critical workflow visibility.
**Flow:**

* Start workflow: “Deploy service + run smoke tests + notify”
* Force a failure in step 2
* Open **Runs UI**: timeline, retries, backoff, operator intervention option
* Trigger compensation step (rollback)
* **Export WorkflowRunReceipt** with step history + linked policy traces

**Win line:** “No black box automation—operators can prove what happened.”

---

### Demo 3 — “Why does Alice have access?”

**Goal:** governance + explainability.
**Flow:**

* Pick a governed entity (doc/report/customer export)
* Click “Access” → “Why Alice can access”
* Show attributes, matching policy rules, source-of-truth identity provider link, and lineage context
* Offer “Request access for Bob” with policy preflight
* **Export AccessDecisionReceipt** bundle for auditor/security review

**Win line:** “Access isn’t tribal knowledge; it’s provable.”

---

### Demo 4 — “Evidence bundle for SOC2-lite control”

**Goal:** compete with compliance automation.
**Flow:**

* Open Compliance Pack → Control “Access Reviews”
* Show continuous check results + exceptions workflow
* Export “Q1 Evidence Bundle”
* **EvidenceBundleManifest** includes signed receipts from actions/workflows, not manual uploads

**Win line:** “Evidence is produced by operations, not collected after the fact.”

---

### Demo 5 — “Tenant/unit economics drill-down”

**Goal:** show business-grade multi-tenant and margin control.
**Flow:**

* Open FinOps dashboard: cost per tenant, cost per workflow run, cost per seat
* Click tenant spike → drill into workflow runs causing it
* Show alert policy + budget threshold + auto-throttle option
* **Export CostAttributionReceipt** (allocation model version + confidence)

**Win line:** “We don’t just run your ops—we tell you what they cost and why.”

---

## 2-page RFP response pack (copy/paste ready)

### Page 1 — Security, governance, and provenance

**Zero trust & access control**

* Central policy layer supports ABAC/RBAC and environment-scoped permissions.
* Policy decisions are logged and queryable with “why” traces (inputs, attributes, rule hits, outcome).
* Sensitive operations support approvals and dual-control patterns.

**Data protection**

* Encryption in transit and at rest; keys managed in KMS with rotation and key usage auditing.
* Data minimization: connectors ingest least privilege; retention is configurable by tenant/policy.
* Selective disclosure/redaction supported for receipts and exports (principle: export only what the viewer is allowed to know).

**Provenance & audit**

* Every privileged action/workflow emits a signed receipt: who/what/when/why/outputs (hashed).
* Evidence bundles are exportable and verifiable (hash chain + signatures).
* Immutable audit logs + tamper-evident manifests.

**Multi-tenancy & isolation**

* Tenant isolation enforced at identity, policy, storage, and compute layers.
* Per-tenant usage metering and cost attribution tracked with high accuracy.
* Policy partitioning ensures tenant A cannot influence tenant B controls.

---

### Page 2 — Operability, compliance, and packaging

**Reliability & operability**

* Workflow run visibility: timeline, retries, compensation, replay, stuck-run detection.
* SLO-based monitoring: error budgets, alerting, runbooks, and drill-down to exact run IDs.
* DR readiness: backup/restore drills and evidence receipts for RPO/RTO objectives.

**Compliance readiness**

* Control packs map requirements → continuous checks → evidence receipts.
* Exception workflows (expiry, approvals) and auditor-friendly exports.
* Retention/deletion manifests produce verifiable “what was deleted” proofs.

**Deployment modes**

* Internal deployment for dogfooding/enterprise on-prem or private cloud.
* White-label deployment: theming + policy profiles + connector certification + offline upgrade playbooks.
* Hosted SaaS: managed tenancy, SLAs, region controls, private networking options.

**Supply chain security**

* SBOMs and build attestations; signed artifacts and policy-gated deploys.
* Least privilege CI/CD; reproducible builds where feasible.

---

## Win/Loss rubric (score deals and map gaps to roadmap)

Score each dimension **0–5**. A “win profile” is typically **≥32/45** with no 0s in the P0s.

### P0: Must-win dimensions

1. **Trust requirement intensity** (regulated, security-sensitive, audit-heavy)

* 0: “Nice to have” audit trails
* 5: auditability is purchase driver

2. **Cross-tool automation pain**

* 0: mostly single-tool workflows
* 5: multi-system actions breaking constantly

3. **Governance/explainability gap** (“why access/why action/lineage”)

* 0: they already have this solved
* 5: it’s a recurring incident/audit issue

4. **Need for policy-bound agents/automation**

* 0: no automation allowed
* 5: they want automation but can’t trust it

5. **Multi-tenant or partner/white-label requirement**

* 0: single org, no partner needs
* 5: partners/tenants are core business

### P1: Strong differentiators

6. **Workflow reliability requirements** (long-running, retries, compensation)
7. **Evidence bundle exports** (auditor workflows, continuous checks)
8. **Connector constraints** (rate limits, permissions, vendor policy change risk)
9. **Unit economics visibility** (chargeback/showback, per-tenant attribution)

### Deal flags (auto-risk)

* **Red flag:** “We just need a portal UI” → we risk getting compared to Backstage/Port only.
  *Response:* lead with trust/receipts + action safety, not UI.
* **Red flag:** “We already bought Vanta and we’re happy” → sell evidence quality + ops receipts; integrate rather than replace.
* **Red flag:** “We’re all-in on ServiceNow” → position as underlay and evidence layer; avoid rip-and-replace.
* **Red flag:** “We need 80 connectors on day one” → qualify into phased connector plan or partner integration.

### Close plan mapping

* If **Trust requirement ≥4** and **Governance gap ≥3** → lead with Demos 1, 3, 4.
* If **Workflow reliability ≥4** → lead with Demo 2.
* If **Multi-tenant ≥4** or **Unit economics ≥3** → lead with Demo 5.
