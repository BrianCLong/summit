# Linear ↔ GitHub Sync Invariants for Governance Tickets

## Purpose

This document codifies the **current** invariants that keep Linear and GitHub governance issues
synchronized without drift. It exists to prevent future workflow changes (deduping,
canonicalization, automation edits) from breaking the mapping.

**Summit Readiness Assertion:** All governance workflows remain bound to the readiness baseline in
[`docs/SUMMIT_READINESS_ASSERTION.md`](../SUMMIT_READINESS_ASSERTION.md).

## Scope

- **In scope:** governance issues in GitHub and their paired Linear issues, along with governance
  workflow comments, labels, and dedupe/canonicalization flows.
- **Out of scope:** any change to the sync tooling itself.

## Definitions

- **Canonical issue:** the single source of truth for a governance work item. All duplicates link
  back to this issue.
- **Duplicate issue:** a governance issue discovered to overlap with a canonical issue.
- **Sync anchor:** fields and comments that the current sync logic depends on to keep mapping
  stable.

## Sync invariants (non-negotiable)

1. **One-to-one pairing:** one Linear issue ↔ one GitHub issue. Never repurpose an existing issue to
   represent a new work item.
2. **Stable identifiers:** the GitHub issue number and Linear issue ID are permanent anchors. Do not
   rewrite or overwrite them in descriptions or automation.
3. **Immutable sync comment:** the initial sync comment that contains cross-links must remain
   present, visible, and unedited.
4. **Canonical continuity:** a canonical issue stays canonical until explicitly replaced. Do not
   promote a duplicate without re-linking all dependents.
5. **Label parity:** governance issues must carry `docs`, `tooling`, and `governance` labels in
   GitHub and the closest matching labels in Linear.
6. **No scope mutation:** expanding scope belongs in a new issue linked to the canonical issue, not
   by rewriting the existing issue.

## Governance workflow comment template

Use this template in any governance workflow comment thread to keep sync assumptions explicit and
stable (link required):

> **Linear ↔ GitHub Sync Guardrail**
>
> This governance issue is synchronized 1:1 with its paired Linear issue. Do not repurpose the
> issue, edit the sync anchor comment, or change canonical linkage. Reference:
> `docs/ci/LINEAR_SYNC.md`.

## Canonicalization + dedupe flow (end-to-end)

**Goal:** Close duplicates without severing sync anchors or breaking the 1:1 mapping.

1. **Select the canonical issue** and state it explicitly in both systems.
2. **Label the duplicate** as `duplicate` (or equivalent) and add a comment linking to the
   canonical issue.
3. **Close the duplicate** only after the canonical issue is confirmed linked in both systems.
4. **Update the canonical issue** with a short note listing the duplicate that was closed.
5. **Audit sync anchors** in both issues to confirm the original sync comment remains intact.

**Concrete example flow:**

- Canonical: **SUM-10466** (Linear) ↔ **GitHub governance issue** (paired).
- Duplicate: **SUM-10466-DUP** (Linear) ↔ **GitHub duplicate issue** (paired).
- Steps:
  1. Add a duplicate comment on both duplicate issues linking to SUM-10466.
  2. Close both duplicate issues with the same canonical link.
  3. Add a note on SUM-10466 listing the duplicate IDs and closure date.
  4. Confirm the sync anchor comment still exists on all four issues.

## Safe-close checklist

- [ ] Canonical issue is named and linked in the duplicate issue.
- [ ] Duplicate issue is closed only after links are confirmed in Linear **and** GitHub.
- [ ] Sync anchor comment remains unchanged.
- [ ] Canonical issue notes the duplicate closure.

## SUM-10466 reference requirement

When editing **SUM-10466**, add a direct link to this document in the issue description so future
workflow edits are bound to these invariants.

## Governed exceptions

Legacy or special-case workflows that deviate from these invariants must be recorded as
**Governed Exceptions** in the canonical issue description and linked to the governance lockfile.

## Observability

- Manual verification via Linear and GitHub issue timelines.
- Any sync break is escalated and documented before further workflow edits.

## Risk + rollback

- **Risk:** documentation drift. **Mitigation:** require doc link in governance comments and
  canonical issue descriptions.
- **Rollback:** remove the doc link and revert to the prior workflow comment template.

## MAESTRO alignment

- **MAESTRO Layers:** Tools, Observability, Security.
- **Threats Considered:** sync anchor tampering, issue repurposing, link spoofing.
- **Mitigations:** immutable sync comment, explicit canonical linkage, duplicate close checklist.
