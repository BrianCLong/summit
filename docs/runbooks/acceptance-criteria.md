# Acceptance & Verification Packs

## 5.1 Functional Smokes (GraphQL)

- `health { ok }` → `true`
- Persisted query: **GetUserDashboard** returns 200 with fields `[widgets{id,type}, alerts{level}]`.
- Mutation: **CreateNote** returns `id` and appears in `GetNotes` within 1s.

## 5.2 Non‑Functional (SLO)

- API p95 ≤ 350ms (reads), ≤ 700ms (writes) during canary.
- Subscriptions fan‑out ≤ 250ms server→client for 100 concurrent clients (sample).

## 5.3 Security

- Trivy image scan: 0 CRIT/HIGH or approved exception.
- Cosign verify + attest pass; SBOM available in artifacts.

## 5.4 Data Ops

- Migrations applied idempotently; `down.sql` documented (if exists) with risk rating.
