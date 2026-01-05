# Prioritization Matrix

## Scoring System

Score = Severity (0-5) + Exploitability (0-5) + Blast Radius (0-5) + User Impact (0-5) + (5 - Effort) + Confidence (0-3) + Dependency/Unblocking Value (0-3)

**Classification**

- **P0**: score >= 23
- **P1**: score 18-22
- **P2**: score <= 17

## Scored Issues

| ID    | Issue (short)                                                        | Sev | Exploit | Blast | User | Effort (inv) | Conf | Dep | Total | Priority |
| ----- | -------------------------------------------------------------------- | --- | ------- | ----- | ---- | ------------ | ---- | --- | ----- | -------- |
| P0-01 | Immutable audit log persistence + tamper-evidence (GA blocker)       | 5   | 4       | 5     | 5    | 1            | 3    | 3   | 26    | P0       |
| P0-02 | Jest test suite blockers across `server/` (see inventory items 1-12) | 4   | 2       | 4     | 5    | 2            | 3    | 3   | 23    | P0       |
| P1-01 | Auth tests missing `scopes` and API contract drift                   | 4   | 3       | 3     | 4    | 3            | 2    | 2   | 21    | P1       |
| P1-02 | Repo tests failing due to pg mock shape + implicit any               | 3   | 2       | 3     | 4    | 3            | 2    | 2   | 19    | P1       |
| P1-03 | OTel tracer initialization failure                                   | 3   | 2       | 3     | 3    | 3            | 2    | 2   | 18    | P1       |
| P1-04 | Vitest imports failing under Jest environment                        | 3   | 2       | 3     | 3    | 3            | 2    | 2   | 18    | P1       |
| P1-05 | Governance acceptance tests failing (missing exports/fixtures)       | 4   | 2       | 3     | 3    | 2            | 2    | 2   | 18    | P1       |
| P1-06 | OPA policy eval error logging without explicit coverage              | 3   | 3       | 3     | 3    | 3            | 2    | 1   | 18    | P1       |
| P2-01 | Sample AWS key in runtime code (`data-residency.ts`)                 | 2   | 2       | 2     | 2    | 4            | 3    | 1   | 16    | P2       |
| P2-02 | Anomaly detector test timestamp mismatch                             | 2   | 1       | 2     | 2    | 4            | 2    | 1   | 14    | P2       |
| P2-03 | Proof-carrying publishing test tmpdir mismatch                       | 2   | 1       | 2     | 2    | 4            | 2    | 1   | 14    | P2       |
| P2-04 | Conductor edge implicit any in `claim-sync.ts`                       | 2   | 1       | 2     | 2    | 4            | 2    | 1   | 14    | P2       |

Notes:

- P0-02 is a collection of release blockers affecting `pnpm --filter intelgraph-server test` and CI gates.
- P0-01 is mandated by `docs/roadmap/STATUS.json` and the readiness contract in `docs/SUMMIT_READINESS_ASSERTION.md`.
