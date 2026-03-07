# Defense-Forward Security Roadmap

**Risk score:** 72 (high). **Confidence:** high. Objective: shrink blast radius, raise auditability, and increase detection and response speed through a prioritized, phased delivery plan across supply chain, CI/CD, IAM/secrets, Kubernetes, networking, application controls, observability, and human/process hardening.

## Delivery Phasing (standard execution mode)

- **Phase 1 (Weeks 1–4):** Execute Epics 1–4 — supply-chain integrity, CI/CD hardening, secrets and identity, IAM boundary roles.
- **Phase 2 (Weeks 5–8):** Execute Epics 5–7 — Kubernetes policy baseline, network and egress controls, observability/forensics.
- **Phase 3 (Weeks 9–12):** Execute Epics 8–9 — application-layer guardrails and people/process hardening.

**Prerequisites:** Owners assigned, non-prod validation environment, policy test harness.
**Verification checkpoints:** policy tests pass, canary deploys succeed, audit logs complete, provenance verification gate enforced.
**Success criteria:** Every prod deploy is signed and verifiable; least-privilege roles enforced; egress restricted; high-signal alerts exist; incident runbooks tested.

## Epics and concrete subtasks

### Epic 1 — Supply-chain integrity: SBOM, provenance, signing, verify gates

Goal: Every artifact deployed to prod is reproducible, signed, and verifiably built from reviewed source.

- Generate CycloneDX SBOMs for each service (CI output stored with artifacts).
- Emit SLSA-aligned provenance attestations for builds.
- Implement keyless cosign signing for container images and build outputs.
- Add a **verify-before-deploy** gate (cosign verify + provenance presence + digest pinning).
- Enforce dependency policy: block known-bad licenses/CVEs above threshold; allowlist exceptions with expiry.
- Add SBOM diffing to PRs to show dependency changes.

Acceptance: 100% of prod-deployed images have a digest pin, SBOM, provenance attestation, and pass the verification gate; exceptions require owner + expiry + ticket reference.

### Epic 2 — CI/CD hardening: least-privilege workflows, safer caches, merge-queue controls

Goal: Reduce CI as an attack surface and prevent compromised pipelines from publishing/deploying.

- Lock down GitHub Actions permissions per workflow (`permissions:` minimal).
- Migrate cloud access to OIDC with scoped roles; eliminate static keys in CI secrets.
- Pin reusable actions by commit SHA; allowlist approved action publishers.
- Harden caches (scoped keys, restore rules, avoid cross-PR poisoning).
- Add freeze-window enforcement in merge queue and deploy jobs.
- Add policy bundle checks (OPA) to block risky changes (IAM wildcard, public buckets, etc.).

Acceptance: No workflow runs with broad default permissions; all cloud access from CI uses OIDC, with static cloud keys removed from Actions secrets.

### Epic 3 — Secrets and identity: eliminate long-lived secrets, rotation, secret zero

Goal: Short-lived credentials by default; fast rotation and clear blast radius when leaks happen.

- Inventory secrets across GitHub, AWS, K8s, apps, and third-party SaaS.
- Replace long-lived tokens with short-lived tokens and scoped roles.
- Implement automatic rotation for high-value secrets (DB, Redis, API keys).
- Build a “secret zero” one-time provisioning flow (break-glass with approvals and audit).
- Enable secret scanning: push protection + org-wide scanning + triage playbook.
- Shift runtime secret access to dynamic fetch where possible (or sealed secrets + strict RBAC).

Acceptance: Rotation SLOs defined; high-value secrets rotated on cadence; emergency rotation drill completes in <30 minutes; secret leak findings auto-open tickets with owner and severity.

### Epic 4 — IAM boundary roles and ABAC with OPA: shrink blast radius

Goal: Make “compromise one thing” not equal “compromise everything.”

- Define boundary roles per environment (dev/stage/prod) with explicit deny rails.
- Enforce session constraints (duration limits, source identity, MFA/WebAuthn step-up for sensitive operations).
- Standardize ABAC tags for resources (team/service/env/data-sensitivity).
- Ship OPA policy bundle: deny wildcard actions, deny cross-env access, enforce required conditions.
- Implement access-review cadence and auto-expire temporary access.

Acceptance: Any role assumption is scoped to one environment and one service boundary; policy simulation shows no wildcard admin paths outside break-glass.

### Epic 5 — Kubernetes policy baseline: pod security, RBAC, admission controls

Goal: Prevent common container/K8s escape hatches and privilege creep.

- Apply pod security baseline: non-root, read-only FS where possible, drop capabilities, no privileged.
- Enforce admission policies blocking hostPath/hostNetwork and default serviceAccount usage.
- Standardize namespace-level RBAC (least privilege) with service accounts per workload.
- Set resource protections (HPA/PDB baselines) to prevent noisy-neighbor and DoS amplification.
- Enforce image policy: only allow signed images from approved registries.

Acceptance: New workloads must pass admission policy checks; privileged pods and broad RBAC bindings trend downward.

### Epic 6 — Network and egress controls: close exfiltration and pivot paths

Goal: Make lateral movement and data exfiltration materially harder.

- Default-deny NetworkPolicies per namespace; allow only required east–west flows.
- Egress allowlisting (DNS + HTTPS destinations) for critical namespaces.
- Lock down Cloudflare tunnel/DNS changes with approvals and audit trails.
- Segment data stores (Postgres/Redis/Neo4j) behind strict network and identity controls.
- Add service-to-service auth baseline (mTLS or signed tokens) for sensitive paths.

Acceptance: Critical workloads cannot reach the public internet except approved destinations; lateral-movement tests fail as expected unless explicitly allowed.

### Epic 7 — Observability, auditability, and forensics

Goal: Faster detection and high-quality evidence under pressure.

- Centralize audit logs (GitHub, AWS CloudTrail, K8s audit, Cloudflare) with retention + immutability controls.
- Define security SLOs (MTTA/MTTR) and alert routes (oncall, exec).
- Create “golden signals” dashboards for auth, egress anomalies, privilege escalations, and deploy events.
- Add tamper-evident log chain/integrity checks for critical streams.
- Prepare incident evidence packet template (hashes, timelines, affected resources).

Acceptance: One-click timeline for who changed what, when, and what deployed; tabletop produces complete evidence packet within 60 minutes.

### Epic 8 — Application security: authZ tests, GraphQL guardrails, data controls

Goal: Prevent “valid user, wrong access” and stop overfetch/under-auth issues.

- Threat-model key routes and GraphQL queries (abuse cases, privilege boundaries).
- Add automated authZ regression tests (positive and negative) to CI.
- Apply GraphQL depth/complexity limits, persisted queries where viable, and per-identity rate limits.
- Add DLP/redaction to prevent sensitive fields leaking to logs/telemetry.
- Enforce SSRF/egress protections: URL allowlists, metadata endpoint blocking, request sanitization.

Acceptance: AuthZ test suite blocks merges on new privilege bypasses; GraphQL query guardrails prevent pathological queries in production.

### Epic 9 — Process, people, and counter-influence hardening

Goal: Reduce social-engineering and process-exploit risk; make changes safer and more reviewable.

- Set reviewer/approver policy for high-risk areas (IAM, deploy, DNS, authZ).
- Enforce “two-person rule” + WebAuthn step-up for sensitive actions.
- Monitor anomaly patterns: unusual PR patterns (sudden consensus, label churn, off-hours merges).
- Provide training: phishing-resistant auth, secure review practices, handling urgent “CEO asks.”
- Run tabletops: “token leak in service X” and “supply-chain compromised dependency.”

Acceptance: Sensitive changes require explicit approvals + step-up auth + logged rationale; tabletop drills completed with documented improvements and follow-up tickets.

## Optional execution modes

- **Safe:** Advisory mode first (alerts/reports), then enforce gates gradually starting with canary projects.
- **Standard (default):** Enforce signing/provenance + least-privilege CI + basic network policies in Phase 1; expand coverage in later phases.
- **Aggressive:** Block merges/deploys immediately on missing provenance, unsigned images, wildcard IAM, and privileged pods (requires tight rollback readiness).

## Ownership and communications

- **Owners notified:** Platform, Security, SRE, App Team, Data Team.
- **Reporting:** Weekly progress against phases; red/yellow/green by epic; surface blockers with owner and ETA.

## Forward-leaning enhancements

- Add **policy-as-code simulation pipelines** (OPA/Conftest) that generate canary diff reports before enforcement.
- Use **automated SBOM/provenance diffing** in merge-queue to preempt risky dependency shifts.
- Adopt **runtime egress behavior learning** (ML-based anomaly detection) to auto-tune allowlists with human approval.
