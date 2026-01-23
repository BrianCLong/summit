# Backlog Sync: Jira ↔ Linear ↔ GitHub Projects

## Authority & alignment

- **Readiness anchor:** `docs/SUMMIT_READINESS_ASSERTION.md` governs operational readiness claims.
- **Roadmap source:** `docs/roadmap/STATUS.json` is the authority for in-repo initiative status.
- **Security Batch 1 scope:** `docs/wave16/airgap-security-batch.md`.
- **Critical-path map:** `docs/architecture/service-dependency-map.md`.
- **First OSINT vertical slice:** `docs/ga-osint/architecture.md`.

## Canonical priority lanes (single source of truth)

Each lane is represented by a canonical ID with normalized metadata. External system IDs are required but intentionally constrained until the sync job writes them into the metadata fields.

| Canonical ID            | Title                                          | Priority | Owner            | Status      | Canonical scope                               | Jira Epic             | Linear Issue          | GitHub Project Item   | PR links              |
| ----------------------- | ---------------------------------------------- | -------- | ---------------- | ----------- | --------------------------------------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| SEC-B1                  | Security Batch 1 (Wave 16)                     | P0       | Security Program | Planned     | `docs/wave16/airgap-security-batch.md`        | Deferred pending sync | Deferred pending sync | Deferred pending sync | Deferred pending sync |
| IG-MAESTRO-COMPANYOS-CP | IntelGraph → Maestro → CompanyOS Critical Path | P0       | Platform PMO     | In progress | `docs/architecture/service-dependency-map.md` | Deferred pending sync | Deferred pending sync | Deferred pending sync | Deferred pending sync |
| OSINT-VS-01             | First OSINT Vertical Slice (GA-OSINT)          | P1       | OSINT Program    | In progress | `docs/ga-osint/architecture.md`               | Deferred pending sync | Deferred pending sync | Deferred pending sync | Deferred pending sync |

## Normalized metadata contract

All systems must carry the following normalized fields, mapped by automation:

- **Canonical ID:** `SEC-B1`, `IG-MAESTRO-COMPANYOS-CP`, `OSINT-VS-01`
- **Priority:** `P0` or `P1`
- **Owner:** `Security Program`, `Platform PMO`, `OSINT Program`
- **Status:** `Planned`, `In progress`, `Blocked`, `Done`
- **Linkage:** Jira Epic Key, Linear Issue ID, GitHub Project Item ID, and GitHub PR links

## Sync glue (automation requirements)

### Labels and fields

Apply the following labels in GitHub and Linear to keep lane membership deterministic:

- `sync:lane:sec-b1`
- `sync:lane:ig-maestro-companyos`
- `sync:lane:osint-vs-01`

### Webhooks and verification

- **GitHub App:** configured per `docs/integrations/SETUP_GITHUB_APP.md`.
- **Jira webhook:** configured per `docs/integrations/SETUP_JIRA.md`.
- **Linear webhook:** configure Linear to post issue updates to the integration hub endpoint used for Jira and GitHub (HTTP 200 required for confirmation).
- **Verification:** use `scripts/verify-integrations.ts` to validate Jira, GitHub, and Linear API credentials before enabling automation.

### Expected automation behavior

1. **Status sync:** Any status change in Jira or Linear updates the matching GitHub Project item `Status` field within 60 seconds.
2. **PR link sync:** When a GitHub PR references a canonical ID (e.g., `SEC-B1`), the integration job links the PR back to Jira and Linear.
3. **Ownership sync:** Owner changes in Jira/Linear update the GitHub Project `Owner` field for the same canonical ID.

### Governance guardrails

- Canonical IDs are the durable identifiers; external IDs are derived and must never overwrite the canonical field.
- All exceptions are recorded as **Governed Exceptions** with an explanatory note in the integration run log.

## Paste-ready summary (Notion/CompanyOS)

- **Security Batch 1:** `SEC-B1` (Jira/Linear/GitHub IDs deferred pending sync)
- **IntelGraph → Maestro → CompanyOS Critical Path:** `IG-MAESTRO-COMPANYOS-CP` (Jira/Linear/GitHub IDs deferred pending sync)
- **First OSINT Vertical Slice:** `OSINT-VS-01` (Jira/Linear/GitHub IDs deferred pending sync)
