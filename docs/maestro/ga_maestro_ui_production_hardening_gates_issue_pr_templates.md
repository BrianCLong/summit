# [GA] Maestro UI — Production Hardening Gates

**Status:** Proposed → In Progress → ✅ Done  
**Owners:** @you, @guy-ig (primary/secondary, rotate weekly)  
**Scope:** Maestro **orchestrator UI** only (Maestro ≠ IntelGraph).  
**Tenancy:** Multi-tenant; **no data residency constraints** at this time.  
**IdP Targets:** **Auth0**, **Azure AD**, **Google** (OIDC/SAML).  
**Browser Support Matrix:** **Chrome**, **Comet**, **Safari**, **Firefox**, **Tor** (latest stable unless noted).  
**Evidence Immutability (Recommendation):** AWS S3 **Object Lock (Governance mode)** + **Versioning** + **SSE‑KMS (CMK)**, default retention **90d**; deny deletes without lock headers; optional **MFA Delete** on admin paths.

---

## Goals

Harden Maestro UI to GA by completing security, tenancy, performance, observability, and provenance gates; ship Playwright/K6 suites; document SLOs & runbooks; enforce evidence in PRs.

---

## Workstream A — Security & Tenancy

### A1. SSO (OIDC/SAML) end‑to‑end

**Targets:** Auth0, Azure AD, Google.

- [ ] Wire OIDC code flow (PKCE).
- [ ] Map IdP groups/claims → RBAC roles (viewer, operator, admin).
- [ ] Session refresh & logout; idle timeout & absolute lifetime.
- [ ] Error/consent screens; IdP failover behavior documented.
      **Acceptance:**
- Playwright E2E shows login, role gating, and logout for all three IdPs.
- Tokens stored in memory/secure cookie (httpOnly, SameSite=strict if cookie).
  **Evidence:** Screenshots/video of each IdP flow; config snippet (redacted); Playwright recording.

### A2. CSP, Security Headers & CSRF

- [ ] CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' <gateway> <grafana>; frame-ancestors 'self'`.
- [ ] HSTS, Referrer-Policy(`strict-origin-when-cross-origin`), X-Content-Type-Options, Permissions-Policy(clipboard).
- [ ] CSRF: double-submit token or SameSite=strict; enforce on all mutating routes.
- [ ] 403 UX for CSRF/CSP violations.
      **Acceptance:**
- ZAP/Burp scan reports **0 High/Critical**.
- Manual CSRF attempt blocked; CSP report shows blocked inline/script injection.
  **Evidence:** Scan report; header dump; unit test of CSRF interceptor.

### A3. Multi-tenant isolation

- [ ] Verify no cross-tenant data leakage in lists (runs, pins, policies, artifacts).
- [ ] Artifact URL scoping & presigned URL TTLs.
- [ ] RBAC enforced on actions (pin, promote, throttle, policy enable).
      **Acceptance:**
- Playwright attempts forced browse across tenants → **403/404**.
- Audit log records actor, tenant, object, action.
  **Evidence:** Playwright script + run output; audit log snippet.

### A4. Secret handling

- [ ] Redaction in UI logs/toasts; provider tests never echo secrets.
- [ ] Clipboard guards where sensitive; warn on copy if applicable.
      **Acceptance:** Secret strings never appear in DOM/logs; manual test passes.  
       **Evidence:** DOM scrape output proves redaction.

---

## Workstream B — Reliability & Performance

### B1. Stream resilience (SSE/WS)

- [ ] Reconnect with exponential backoff; `Last-Event-ID` support; dedupe/idempotency.
- [ ] Out-of-order handling & UI state reconciliation.
      **Acceptance:**
- Chaos test (drop/recover) keeps logs/timeline consistent; no duplicate UI rows.
- Recovery < **5s** at p95.
  **Evidence:** Playwright video + console logs; test harness output.

### B2. Performance budgets

- [ ] Runs list (10k rows) filter/sort **<1.5s**.
- [ ] Live logs: **≥30k lines/min** without jank (CPU <30% dev laptop).
- [ ] DAG 2k/5k nodes/edges FP **<2s**, pan/zoom **<16ms** frame.
- [ ] AlertCenter incidents (2k events) group **<700ms**.
- [ ] RUM metrics (LCP, INP) collected.
      **Acceptance:** K6 + browser profiles meet budgets.  
       **Evidence:** K6 summary JSON; performance profiles; RUM dashboard link.

---

## Workstream C — Supply Chain & Evidence

### C1. Evidence immutability (S3 Object Lock)

- [ ] Create bucket with Object Lock Governance mode + Versioning.
- [ ] Default retention 90d (overrideable via API).
- [ ] Bucket policy denies overwrite/delete without Object Lock headers.
- [ ] SSE‑KMS (CMK) with rotation policy. Optional MFA Delete for admin.
      **Acceptance:** Attempted delete/overwrite **fails** during retention window.  
       **Evidence:** AWS policy doc; CLI session showing Denied; screenshot of Object Lock config.

### C2. Cosign/SBOM/SLSA verification (server‑side)

- [ ] Gateway verifies signatures/attestations; UI reflects result only.
- [ ] Provenance badge shown when verified; copy digest/verify cmd present.
      **Acceptance:** Tampered artifact → **FAIL**; good artifact → **PASS**.  
       **Evidence:** Verification logs; UI screenshot of PASS/FAIL.

---

## Workstream D — Observability & SLOs

### D1. OTel linking & traceability

- [ ] Propagate trace context from UI → gateway; link run/node rows to trace viewer.
- [ ] Error boundaries emit spans with cause.
      **Acceptance:** Click-through from UI to trace for key flows.  
       **Evidence:** Video showing correlation.

### D2. SLOs & Alerting

- [ ] Define SLOs (TTFP, stream recovery, gate decision latency).
- [ ] Grafana dashboards (overview, SLO, cost).
- [ ] AlertCenter receives SLO burn events; on-call runbooks wired.
      **Acceptance:** Synthetic burn triggers AlertCenter incident; runbook template applies.  
       **Evidence:** Dashboard links; incident screenshot.

---

## Workstream E — Accessibility & UX

- [ ] axe CI passes (WCAG 2.2 AA).
- [ ] Full keyboard paths (palette, dialogs, run actions).
- [ ] Reduced motion respected.
      **Acceptance:** axe report **0 serious/critical**; manual checks pass.  
       **Evidence:** axe CI output; video of keyboard nav.

---

## Workstream F — Docs & Runbooks

- [ ] Operator Runbook (promote, rollback, gate override, serving alerts).
- [ ] Security Appendix (CSP, CSRF, tenancy, retention).
- [ ] Blue/Green rollout + rollback with cache bust; CDN purge steps.
      **Acceptance:** Dry-run documented & demo recorded.  
       **Evidence:** Links to docs; demo video.

---

## Milestones & Owners

| Milestone           | Contents | Owner(s)      | Target |
| ------------------- | -------- | ------------- | ------ |
| M1 Security         | A1–A4    | @you, @guy-ig | T+2w   |
| M2 Perf/Reliability | B1–B2    | @you          | T+3w   |
| M3 Observability    | D1–D2    | @guy-ig       | T+4w   |
| M4 Supply Chain     | C1–C2    | @you          | T+5w   |
| M5 Docs/Runbooks    | E + F    | @you, @guy-ig | T+6w   |

---

## Definition of Done (DoD)

- All milestone checkboxes complete.
- PRs contain **Gate Evidence** per template and pass **enforce‑ga‑gates** workflow.
- Blue/Green cutover executed with RUM and error rate steady.
- On‑call rotation documented (Owners: **you & me**).

---

## How to Provide Evidence (attach in PR)

- **Screenshots/recordings** (SSO, incidents, explain).
- **Links** to Grafana dashboards (overview/slo/cost).
- **Artifacts**: K6 JSON, Playwright traces, ZAP/Burp report, AWS policy JSON.
- **Text**: audit log excerpts (IDs redacted).

---

## Labels

`ga`, `security`, `tenancy`, `performance`, `observability`, `supply-chain`, `a11y`, `docs`, `evidence-required`

---

# ⬇️ Copy into `.github/pull_request_template.md`

```md
## Summary

Explain what changed and why.

## Gates Touched

- [ ] Security/Tenancy
- [ ] Reliability/Performance
- [ ] Supply Chain/Evidence
- [ ] Observability/SLOs
- [ ] Accessibility/UX
- [ ] Docs/Runbooks

## Evidence (required)

> Attach links/files; PR will fail without at least one item per checked gate.

- SSO / RBAC: [link/screenshot]
- CSP/Headers/CSRF: [report/header dump]
- Perf/Load (K6/RUM): [artifact/link]
- Streams resilience: [video/log]
- Evidence immutability: [AWS policy + denied attempt]
- Cosign/SBOM/SLSA: [verify logs]
- SLO/AlertCenter: [dashboard/incident]
- A11y: [axe CI output]

## Rollback Plan

Describe rollback steps and impact.

## Security

- Threat model impact: [ ] None / [ ] Yes (explain)
- CSP diff included: [ ] Yes / [ ] N/A
- CSRF tokens updated/enforced: [ ] Yes / [ ] N/A

## Testing

- Unit/Integration: [summary]
- E2E (Playwright): [link to trace]

## Docs

- [ ] Updated Operator Runbook
- [ ] Updated Security Appendix

## Checklist

- [ ] I confirm evidence is attached for each gate touched.
- [ ] I confirm on‑call is informed of any operational changes.
```

---

# ⬇️ Copy into `.github/workflows/enforce-ga-gates.yml`

```yaml
name: Enforce GA Gates Evidence
on:
  pull_request:
    types: [opened, edited, synchronize]
permissions:
  contents: read
  pull-requests: write
jobs:
  check-evidence:
    runs-on: ubuntu-latest
    steps:
      - name: Validate PR template sections
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const body = context.payload.pull_request.body || '';
            const touched = ['Security/Tenancy','Reliability/Performance','Supply Chain/Evidence','Observability/SLOs','Accessibility/UX','Docs/Runbooks']
              .filter(k => body.includes(`- [x] ${k}`) || body.includes(`- [X] ${k}`));
            const evidence = body.match(/## Evidence[\s\S]*?##/m) || body.match(/## Evidence[\s\S]*$/m);
            const hasEvidence = evidence && evidence[0].trim().length > 20;
            if (!hasEvidence) {
              core.setFailed('Evidence section missing or empty.');
            }
            core.notice(`Gates checked: ${touched.join(', ') || 'none'}`);
```

---

# ⬇️ Optional: Issue template for future GA gates (`.github/ISSUE_TEMPLATE/ga_gates.md`)

```md
---
name: GA Gates Epic
about: Track GA hardening for a surface
labels: ga
---

## Context

Surface: <!-- e.g., Maestro UI -->

## Gates

- [ ] Security/Tenancy
- [ ] Reliability/Performance
- [ ] Supply Chain/Evidence
- [ ] Observability/SLOs
- [ ] Accessibility/UX
- [ ] Docs/Runbooks

## Owners

Primary: @
Secondary: @

## Acceptance Criteria

List per-gate criteria.

## Evidence

Attach artifacts/links.
```

---

## Notes

- **S3 Object Lock**: start in _Governance_ mode (operationally flexible); consider _Compliance_ mode later if regulatory needs arise.
- **Browser matrix**: certify latest stable; for Tor (Firefox ESR base), validate security headers and degraded mode (no third‑party iframes).
- **On‑call:** shared rotation (you ↔ me); add calendar + escalation doc link.
