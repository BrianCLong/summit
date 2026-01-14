# Claim Lifecycle & Governance

This document defines the lifecycle of a public claim about Summit, from proposal to General Availability (GA).

## The Golden Rule

> **"No Claim Without Evidence."**
> Every claim made in public documentation, marketing, or sales material must be backed by a verified artifact in the Claim Ledger.

## Lifecycle Stages

| Stage | Status | Description | Action Required |
|---|---|---|---|
| **1. Proposal** | `PROPOSED` | Claim is drafted and scaffolded. **Not visible to public.** | Run `pnpm ga:claim:scaffold` |
| **2. Implementation** | `EVIDENCE REQUIRED` | Evidence stub exists, but command fails or is pending. | Implement feature + test. |
| **3. Verification** | `VERIFIED` | Automated evidence command passes in CI. | Update Ledger status. |
| **4. GA Approved** | `GA` | Claim is merged into public copy and allowed by Drift Guard. | Release. |
| **5. Post-GA** | `POST-GA` | Feature scheduled for post-GA stabilization. | Exempt from GA Drift Guard. |

## Workflow

### 1. Propose a New Claim
Use the automated tool to scaffold the claim. This ensures it enters the system correctly.

```bash
pnpm ga:claim:scaffold
```

**Inputs:**
- **Text:** The exact wording of the claim (e.g., "Summit provides zero-knowledge encryption").
- **Scope:** `ga` or `post-ga`.
- **Category:** `security`, `data`, `architecture`, `ai`, etc.
- **Evidence:** How you will prove it (test, log, scan).

**Output:**
- Adds entry to `docs/claims/CLAIMS_REGISTRY.md` with ID (e.g., `SEC-005`).
- Adds stub to `docs/release/GA_EVIDENCE_INDEX.md`.
- Adds entry to `website/src/content/ga.claims.json`.

### 2. Implement & Evidence
The scaffold tool creates a "Pending" entry. You must now make it real.

1. **Write the code/feature.**
2. **Create the evidence.**
   - *Test:* A unit/integration test that fails if the feature breaks.
   - *Log:* A log entry that proves execution.
   - *Scan:* A security scan report.
3. **Update the Evidence Index.**
   - Edit `docs/release/GA_EVIDENCE_INDEX.md`.
   - Replace the `TBD` command with the actual verification command (e.g., `pnpm test:security`).

### 3. Verification & Promotion
Once the evidence command passes in CI:

1. Update `docs/claims/CLAIMS_REGISTRY.md`: change status from `PROPOSED` to `VERIFIED`.
2. Commit and merge.

### 4. Drift Guard Enforcement
The Drift Guard (`scripts/ga/verify-claim-drift.mjs`) runs in CI.

- **It BLOCKS** any usage of `PROPOSED` claims in `website/` or `docs/`.
- **It ALLOWS** usage of `VERIFIED` or `POST-GA` claims.

This prevents "Documentation Drift" where we promise things we haven't built yet.
