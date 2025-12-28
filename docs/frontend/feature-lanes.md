# Frontend Feature Lanes (Post-GA Velocity)

## Purpose

Frontend changes must ship through explicit feature lanes to protect GA correctness,
trust, and compliance while enabling parallel development. Every frontend PR must
declare exactly one lane and comply with its rules.

## Lane Definitions

### Lane A — GA-Safe Enhancements

**Purpose:** Low-risk improvements that may ship directly to production.

**Allowed**

- Accessibility improvements
- Performance optimizations
- Visual polish
- Error handling improvements

**Prohibited**

- Changes to GA-locked semantics or claims
- Reinterpretation of existing metrics
- Modifying GA-locked surfaces without approval

**Shipping rule:** May ship directly after standard frontend review + CI.

### Lane B — GA-Adjacent Extensions

**Purpose:** New functionality that is explicitly additive around GA surfaces.

**Allowed**

- New optional panels
- New export formats
- Additional drill-downs

**Prohibited**

- Altering GA surfaces or semantics
- Changing interpretation of existing metrics

**Shipping rule:** Must be additive and isolated; ship with senior frontend +
product approval and isolation tests.

### Lane C — Experimental / Preview

**Purpose:** High-uncertainty, exploratory frontend work.

**Allowed**

- New analytics paradigms
- Advanced visualizations
- Prototype workflows

**Prohibited**

- Shipping enabled by default
- Unflagged exposure in production

**Shipping rule:** Must be fully isolated, gated behind a feature flag, and
carry explicit graduation/expiration criteria.

### Lane D — Governance / Compliance Evolution

**Purpose:** Frontend work that affects governance, autonomy, or compliance
representation.

**Allowed**

- New compliance views
- Autonomy-adjacent UX
- Risk framing changes

**Prohibited**

- Shipping without governance + compliance review
- Shipping without documentation updates

**Shipping rule:** Highest scrutiny lane; cannot ship without explicit claim
review and documentation updates.

## Ownership, Review, and Test Matrix

| Lane | Ownership                       | Required Reviewers                        | Required Tests                             |
| ---- | ------------------------------- | ----------------------------------------- | ------------------------------------------ |
| A    | Frontend Lead                   | Frontend review + CI                      | Standard frontend unit/UI tests            |
| B    | Frontend Lead + Product         | Senior frontend + product                 | Add isolation tests + targeted UI coverage |
| C    | Frontend Lead + Design/Research | Senior frontend + design/research         | Flag-gated tests + isolation tests         |
| D    | Governance Lead + Compliance    | Governance + compliance + senior frontend | Governance checks + claim audit + UI tests |

## Lane Declaration & Enforcement

- Every frontend PR **must declare exactly one lane** in the PR template.
- The CI lane gate checks for exactly one lane selection plus required
  justification and reviewer routing fields.
- Multi-lane PRs are **not allowed**.

## Feature Flag & Staging Rules

- **Lane A:** Feature flags optional; avoid unless risk requires staging.
- **Lane B:** Feature flags required for new surfaces; staging rollout required.
- **Lane C:** Feature flags mandatory; never enabled by default; include
  expiration/graduation criteria and owner.
- **Lane D:** Feature flags mandatory with governance ownership; staging required
  with compliance verification.

**Flag ownership:** The lane owner is accountable for flag lifecycle, including
cleanup. Flags must have a documented owner, default state, and retirement date.

**Preview isolation:** Preview-only UI must live behind explicit flags and
must not be wired into production navigation by default.

## Escalation & Downgrade Rules

- **Escalate** when scope touches GA-locked semantics, compliance representation,
  or requires broader blast-radius review.
- **Downgrade** only when the change is strictly additive, isolated, and
  confirmed by reviewers.
- Any escalation/downgrade must be documented in the PR summary and re-reviewed
  per the new lane.

## Shipping Guardrails

- GA-locked surfaces require explicit approval even in Lane A or B.
- Lane C and D changes **never** ship enabled by default.
- Documentation updates are required for Lane D to preserve governance and
  claim integrity.
