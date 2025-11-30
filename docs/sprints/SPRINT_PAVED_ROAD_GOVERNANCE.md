# Sprint Plan: Paved Road + Proof of Governance

* **Length:** 2 weeks
* **Theme:** “Paved Road + Proof of Governance”
* **Primary Goal:**
  * Give engineers a **Golden Path** to ship a new service with observability baked in.
  * Prove our **supply-chain & policy gates** work end-to-end on at least one real service.
* **Success Criteria (end of sprint):**
  1. A new “hello-prod” service created via **paved-road template**, deployed via CI/CD.
  2. That service ships with **metrics, logs, traces, SLOs, and a golden dashboard**.
  3. CI pipeline for that service emits an **SBOM**, **signs its image**, and **enforces an OPA policy gate** (fail-closed).
  4. We can show a **single-page evidence pack** covering design, tests, SBOM, and policy checks for this release.

We split work into **Track A (Now-Value)** and **Track B (Moat)**, but they interlock around this one reference service.

---

## 1. Track A – Now-Value (Golden Path Platform)

### A1. Paved-Road Service Template v0.1

**Objective:**
Standardize how a new service is created so we get consistency, observability, and policy hooks “for free”.

**Scope / Tasks:**

* Create a **service scaffold** (Node/Express/TypeScript) that includes:
  * HTTP health & readiness endpoints.
  * Structured logging (trace IDs propagated).
  * Basic metrics endpoint (e.g., `/metrics`).
  * OpenTelemetry hooks (even if no exporter wired yet).
* Provide a **CLI or script**: `companyos new-service <name>` that:
  * Creates repo/module from template.
  * Adds standard CI config files.
  * Registers basic metadata (e.g., `service.yaml`).

**Deliverables / Artifacts:**

* `templates/service/` directory.
* Short **ADR**: “ADR-0013: Paved-Road Service Template”.
* README: how to use the template + constraints.

**Acceptance Criteria:**

* Running one command creates a buildable, testable service locally.
* CI pipeline passes on the generated service with no manual tweaks.
* Logging includes correlation IDs/trace IDs in at least one log line per request.
* ADR approved and merged.

**Owner:** Platform Engineer (with Architect-General review).

---

### A2. Local Dev Stack (Docker Compose / Devcontainer) for Paved-Road Services

**Objective:**
Eliminate “works on my machine” by providing a standard local stack.

**Scope / Tasks:**

* Provide a **Docker Compose or devcontainer** setup for a template-generated service including:
  * App container.
  * Optional backing service (e.g., local Postgres or in-memory stub).
* Standard `.env.example` with a **minimal set of required env vars**.
* Document **hot reload** or fast-feedback loop (e.g., `npm run dev`).

**Deliverables / Artifacts:**

* `docker-compose.yml` (or devcontainer) in the template.
* README section: “Local Development”.

**Acceptance Criteria:**

* New engineer can:
  * Clone repo.
  * Run one command (`docker compose up` or equivalent).
  * Hit a health endpoint successfully.
* No secrets hardcoded in any config; secrets loaded via env.

**Owner:** Platform Engineer / DevEx Engineer.

---

### A3. Observability Baseline for the Reference Service

**Objective:**
Make observability non-optional for the first paved-road service.

**Scope / Tasks:**

* Instrument:
  * **Metrics:** request rate, latency, error rate.
  * **Logs:** structured JSON logs including trace ID, user ID (if applicable), and request path.
  * **Traces:** basic spans for inbound requests.
* Create **golden dashboard v0.1**:
  * SLO panel (e.g., 99% availability or latency SLO).
  * Error-rate chart.
  * Latency p50/p95 chart.
* Define **SLO + error budget** for this service.

**Deliverables / Artifacts:**

* Observable service deployed to at least one non-prod environment.
* Dashboard link in docs.
* SLO document: “SLO-00X – Reference Service”.

**Acceptance Criteria:**

* You can:
  * Trigger a test request and see it in logs, metrics, and traces.
  * See the service on a dashboard with SLO visible.
* Alert rule defined (even if not yet paging, at least a warning-level alert).

**Owner:** SRE / Observability Engineer.

---

### A4. Post-Deploy Validation & Runbook v0.1

**Objective:**
Ensure every release comes with a way to validate and a way to respond when things go wrong.

**Scope / Tasks:**

* Define **post-deploy checks** script or checklist:
  * Synthetic probe to hit key endpoints.
  * Query metrics for error spike.
* Create a **runbook**:
  * “If SLO burn > X%, do Y.”
  * Rollback instructions: how to revert to previous version.
* Include **trace ID** propagation into error messages surfaced to users (where appropriate), for easier support.

**Deliverables / Artifacts:**

* Markdown runbook in repo.
* Post-deploy checklist documented and linked from CI pipeline.

**Acceptance Criteria:**

* Anyone on call can follow the runbook to:
  * Identify current version.
  * Roll back to the previous version.
* Post-deploy checks automated in CI or easily runnable via a documented command.

**Owner:** SRE with Platform Engineer.

---

## 2. Track B – Moat (Supply Chain & Policy Fabric)

### B1. SBOM Generation in CI for Reference Service

**Objective:**
Make **SBOM a default artifact** for every build of our reference service.

**Scope / Tasks:**

* Integrate an SBOM tool (e.g., Syft/other) into CI.
* Generate SBOM on every build and:
  * Attach it to the build artifacts.
  * Store a copy/metadata in a central location or artifact registry path.

**Deliverables / Artifacts:**

* CI config with SBOM generation step.
* Documented location and format of SBOM artifacts.
* ADR: “ADR-00Y: SBOM Strategy for CompanyOS”.

**Acceptance Criteria:**

* Every successful build includes an SBOM artifact.
* SBOM covers all direct dependencies for the reference service.
* Failing SBOM step fails the build.

**Owner:** Security/Infra Engineer.

---

### B2. Container Signing & Verification (cosign or equivalent)

**Objective:**
Ensure **all images** for the reference service are **signed and verified** before deploy.

**Scope / Tasks:**

* Add a CI step to:
  * Sign the built container image with cosign (or chosen tool).
  * Store signatures alongside image in registry.
* Add a **pre-deploy verification step**:
  * Deployment fails if signature is missing or invalid.

**Deliverables / Artifacts:**

* CI/CD changes for signing & verify.
* Short doc: “How signing keys are managed” (one-pager).
* Runbook update: “What to do if signature verification fails”.

**Acceptance Criteria:**

* A test image with a **tampered tag** fails verification and blocks deploy.
* Normal build → sign → verify → deploy path works end-to-end.
* Keys are **not** committed anywhere; key management documented.

**Owner:** Security/Infra Engineer.

---

### B3. OPA Policy Gate (Fail-Closed) on PR & Release

**Objective:**
Turn governance into code: enforce OPA policies in CI for PRs and releases.

**Scope / Tasks:**

* Stand up an **OPA policy bundle** for:
  * Required labels (e.g., risk, data classification).
  * No critical vulnerabilities above defined CVE threshold (even if initially stubbed).
  * SBOM and signing steps must be present in pipeline.
* Integrate policy check into CI:
  * PRs: require policy check to pass before merge.
  * Releases: require policy check to pass before deployment.

**Deliverables / Artifacts:**

* `policy/` directory with Rego policies.
* CI step that evaluates policies against:
  * PR metadata.
  * Build metadata (e.g., SBOM presence).
* ADR: “ADR-00Z: OPA in CI/CD for CompanyOS”.

**Acceptance Criteria:**

* Intentionally misconfigured PR (e.g., missing label) is blocked by OPA.
* Policy violations show a **clear, human-readable message** to devs.
* Policy gate is **fail-closed**: if OPA step fails to run, PR/release cannot proceed.

**Owner:** Security/Policy Engineer + Platform Engineer.

---

### B4. Evidence Pack v0.1 for Reference Service Release

**Objective:**
“Evidence or it didn’t happen”: one place to show we did this right.

**Scope / Tasks:**

* Create a **single-page markdown or HTML “Evidence Pack”** for the reference service’s release including:
  * ADR links (template, SBOM, OPA).
  * CI run link.
  * SBOM artifact link.
  * Signature verification results.
  * SLO dashboard screenshot/link.
  * Post-deploy validation result.
* Standardize this as a template for future releases.

**Deliverables / Artifacts:**

* `docs/evidence/release-<version>.md` (or equivalent).
* Re-usable template for future releases.

**Acceptance Criteria:**

* You can review one document and answer:
  * “What changed?”
  * “Was it tested?”
  * “Is it compliant with our current policy?”
  * “How do we roll it back?”
* Template merged into repo for reuse.

**Owner:** Architect-General + Product/Eng Manager.

---

## 3. Sprint Logistics & Rituals

### Kickoff (Day 1)

* Confirm owners and dependencies for A1–A4, B1–B4.
* Explicitly mark:
  * **Must-have:** A1, A3, B1, B3.
  * **Should-have:** A2, B2.
  * **Stretch:** A4, B4.

### Mid-Sprint Check (Day ~7)

* Demo:
  * `new-service` scaffold creating a running service.
  * SBOM artifact in CI.
* Decide:
  * If B2 (signing) is behind, trim to minimum viable (sign + verify for one env).

### Evidence Review (Last Day)

* Walk through:
  * Reference service dashboard (SLO, logs, traces).
  * CI pipeline showing SBOM + policy gate.
  * Evidence pack doc.
* Capture follow-ups as **next-sprint candidates** (e.g., expand to second service, add more policies, more SLOs).
