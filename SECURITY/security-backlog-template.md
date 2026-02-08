# Security Hardening Backlog Template (Jira/Linear Ready)

Use this template to seed Jira/Linear with enforceable, low-blast-radius security work. It includes nine epics with ready-to-paste tickets, a two-week Sprint 0 starter set, and the first merge/deploy gates to enable in a pilot service.

## Working Agreements
- Pilot-first: enable controls in a single repo/service before scaling.
- Enforceable gates: every control ships with Definition of Done (DoD), exception path, and expiry.
- Owners: Platform + Security as co-owners; SRE on call for deploy gates.

## Epic Backlog (copy-paste blocks)

### EPIC 1 — Supply-chain Integrity (SBOM + Provenance + Signing + Verify Gates)
Outcome: Every deployable artifact is digest-pinned, signed, and verifiable.
- **E1-T1** Add CycloneDX SBOM generation to build pipeline — DoD: SBOM artifact attached to build; includes transitive deps.
- **E1-T2** Emit SLSA provenance attestation (build metadata) — DoD: attestation uploaded; references source + digest.
- **E1-T3** Sign container images keylessly (cosign) — DoD: signature exists for image digest in registry.
- **E1-T4** Enforce verify-before-deploy (stage first) — DoD: stage deploy fails on missing/invalid signature or attestation.
- **E1-T5** SBOM diff comment on PRs (dependency delta) — DoD: PR shows added/removed deps; exceptions require ticket+expiry.
- **E1-T6** Exception mechanism (allowlist with expiry + owner) — DoD: automated expiry warning + enforcement after expiry.

### EPIC 2 — CI/CD Hardening (Least privilege + pinned actions + safe caches)
Outcome: CI cannot be used as a trampoline to cloud/admin access.
- **E2-T1** Set minimal `permissions:` for all workflows — DoD: repo-wide check passes; deploy workflows only have what they need.
- **E2-T2** Pin third-party actions by commit SHA — DoD: no unpinned actions in deploy/release workflows.
- **E2-T3** Move cloud auth to OIDC (remove static keys) — DoD: AWS keys removed; OIDC role scoped to env+service.
- **E2-T4** Cache hardening (scoped keys, no privileged restore) — DoD: privileged jobs do not restore caches from untrusted contexts.
- **E2-T5** Merge-queue/freeze-window enforcement — DoD: deploy jobs blocked during freeze unless break-glass approved.

### EPIC 3 — Secrets Modernization (short-lived, rotation, leak response)
Outcome: Secrets are short-lived or quickly rotatable; leaks are survivable.
- **E3-T1** Secrets inventory + criticality classification — DoD: owner + system + rotation cadence for top 20.
- **E3-T2** Implement rotation for top 3 secrets — DoD: automated rotation job + rollback + tested in stage.
- **E3-T3** Replace one static secret in pilot with short-lived credential — DoD: pilot no longer depends on long-lived token.
- **E3-T4** Secret scanning + push protection (org-level) — DoD: leaks blocked at push; alerts routed to oncall.
- **E3-T5** “Leak drill” runbook + tabletop — DoD: rotate+invalidate within target window; evidence packet captured.

### EPIC 4 — IAM Boundaries + ABAC/OPA Guardrails
Outcome: Identity compromise has limited blast radius; risky IAM changes blocked.
- **E4-T1** CI role permission narrowing (CloudTrail-informed) — DoD: role has only required actions; no wildcards.
- **E4-T2** Boundary roles per env (dev/stage/prod) with explicit denies — DoD: stage role cannot touch prod resources.
- **E4-T3** OPA policy bundle in CI (deny wildcards/public exposure) — DoD: policy tests pass; violations block merge.
- **E4-T4** Step-up auth for sensitive ops (WebAuthn/MFA) — DoD: enforced for IAM/DNS/deploy approvals.

### EPIC 5 — Kubernetes Security Baseline (admission, RBAC, pod hardening)
Outcome: No privileged pods by default; RBAC minimized and auditable.
- **E5-T1** Pod security baseline (non-root, drop caps, RO FS where possible).
- **E5-T2** Admission controls: block hostPath/hostNetwork/privileged.
- **E5-T3** ServiceAccount per workload + remove default SA usage.
- **E5-T4** Image policy: only signed images from approved registries.

### EPIC 6 — Network & Egress Controls (segmentation + exfil prevention)
Outcome: Compromised pods can’t freely pivot or exfiltrate.
- **E6-T1** Default-deny NetworkPolicies in critical namespaces.
- **E6-T2** Egress allowlist (DNS + HTTP(S) destinations).
- **E6-T3** Data store segmentation (Postgres/Redis/Neo4j).
- **E6-T4** Cloudflare change controls (approvals + audit trail).

### EPIC 7 — Observability & Forensics (tamper-evident, high signal)
Outcome: Fast detection and defensible evidence.
- **E7-T1** Centralize audit logs (GitHub/AWS/K8s/Cloudflare) + retention.
- **E7-T2** Security dashboards (auth anomalies, egress spikes, deploy events).
- **E7-T3** Alert routing + oncall runbooks.
- **E7-T4** Evidence packet automation (timeline + hashes + impacted resources).

### EPIC 8 — App-Layer Hardening (authZ tests + GraphQL guardrails)
Outcome: Prevent privilege bypass and overfetch/under-auth data access.
- **E8-T1** AuthZ regression test suite (negative tests required).
- **E8-T2** GraphQL depth/complexity limits + rate limits.
- **E8-T3** Persisted queries (where viable) + disable introspection in prod (if appropriate).
- **E8-T4** DLP/redaction for logs + telemetry.

### EPIC 9 — Process & Counter-Influence Hardening (review integrity)
Outcome: Sensitive changes are reviewed safely; social engineering is blunted.
- **E9-T1** High-risk change policy (IAM/DNS/deploy/auth) + two-person rule.
- **E9-T2** Reviewer anomaly checks (off-hours merges, label churn, sudden consensus).
- **E9-T3** Training: secure reviews + urgent-request handling.
- **E9-T4** Tabletop drills: token leak + compromised dependency.

## Sprint 0 (first two weeks) — copy into sprint board
1. Pilot service selected + owners assigned.
2. E1-T1 SBOM + E1-T3 signing + E1-T4 verify gate **in stage**.
3. E2-T1 minimal workflow permissions + E2-T3 OIDC deploy role (pilot only).
4. E3-T1 secrets inventory + E3-T3 replace one static secret (pilot).
5. E4-T3 OPA policy bundle (deny wildcard IAM/public exposure) running advisory → enforce on pilot repo.

## First Gates to Enable (low blast radius)
- **Deploy gate (stage)**: Block deploy unless image digest pinned ∧ cosign signature valid ∧ provenance present. Exception: allowlist entry with owner + expiry + ticket; auto-expire enforced.
- **Merge gate**: Block merge unless secret scan clean ∧ OPA denies pass ∧ actions in deploy workflows are pinned by SHA. Exception path mirrors deploy gate (owner + expiry + ticket + auto-revoke).

## Success Criteria & Checks
- Success: pilot stage deploy blocked unless signature+provenance verify passes; CI uses OIDC; at least one high-value secret rotated/replaced.
- Checks to keep green: signed image verification in stage; workflow permissions lint; policy bundle tests; secret scanner clean; exception expiry alerts.
