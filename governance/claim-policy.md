# Summit Claim Policy

Version: 0.1
Status: Adopted (Draft-to-Enforce)
Owner: Marketing Governance (with Security + Eng reviewers)
Scope: All externally facing narrative artifacts and any internal materials that influence buying decisions.

## 1. Purpose

This policy governs what Summit may claim in marketing, pitch, sales, press, partner, and customer-facing materials. It ensures claims are:

- Technically accurate
- Strategically consistent
- Defensible under scrutiny
- Appropriately scoped and qualified
- Reviewable and enforceable in CI

This policy treats claims as governed assets, comparable to release gates and compliance posture.

## 2. Definitions

### 2.1 Claim

A statement that implies Summit provides a capability, property, outcome, guarantee, or comparative advantage.

Examples:

- “Summit enforces policy preflight for privileged actions.”
- “Summit produces provenance receipts.”
- “Summit reduces incident response time.”
- “Summit is more secure than alternatives.”

### 2.2 Claim Strength

A normalized intensity classification:

- **Soft**: descriptive, non-absolute (“can help”, “supports”, “designed to”)
- **Moderate**: confident but bounded (“provides”, “enforces”, “includes”)
- **Strong**: implies outcomes or broad coverage (“prevents”, “ensures”, “eliminates”, “guarantees”)

### 2.3 Claim Scope

The breadth of the claim:

- **Bounded**: limited to defined conditions (“for configured routes”)
- **General**: broad but not universal (“across the platform”)
- **Universal**: always/never language (“all”, “every”, “no”, “zero”, “guaranteed”)

### 2.4 Evidence

Artifacts that substantiate claims:

- Code references (paths, symbols)
- Tests and verification scripts
- Documentation with specific implementation references
- Release gates / checklists
- Benchmarks (methodology required)
- External audits or attestations (when applicable)

## 3. Policy Rules

### 3.1 No Overclaiming

Claims must not exceed current implemented capability. Roadmap items may be discussed only if:

- Explicitly labeled as “Planned” or “In Progress”.
- Not framed as available today.
- Not included in press/sales materials as a committed deliverable unless approved.

### 3.2 No Absolute Guarantees Without Proof

Language implying universal outcomes is prohibited unless backed by formal proof, contractual guarantee, or certification.

Prohibited examples:

- “guaranteed compliance”
- “eliminates breaches”
- “zero risk”
- “fully autonomous without human oversight”
- “certified SOC2/ISO” unless true and documented

### 3.3 Compliance and Security Posture Must Be Conservative

Allowed:

- “compliance-ready”
- “supports controls aligned to SOC-style expectations”
- “designed to enable auditability”

Not allowed:

- “compliant” or “certified” without an actual certification and scope statement.

### 3.4 Comparative Claims Require a Basis

Comparative claims (“better”, “faster”, “more secure”) must include:

- Comparator definition
- Measurement basis or rationale
- Boundaries/assumptions

If not available, rewrite to non-comparative statements.

### 3.5 Claims Must Be Attributable

Each artifact must provide one of:

- Inline claim references (claim IDs)
- A companion claim registry file
- A link to an approved claim list

### 3.6 Claim Registry is Source of Truth

All externally used claims MUST appear in the Claim Registry (machine-readable) with:

- ID
- Strength/scope rating
- Evidence links
- Reviewer sign-offs

Unregistered claims are non-compliant.

## 4. Claim Classification Matrix

### 4.1 Allowed by Default (Low Risk)

- Feature descriptions with bounded scope
- “Designed to / supports / enables” phrasing
- Claims tied directly to a documented implementation

### 4.2 Allowed with Review

- Claims involving security posture
- Claims involving compliance readiness
- Claims involving performance
- Claims involving customer outcomes

### 4.3 Prohibited Without Formal Evidence

- Universal guarantees
- “Eliminates” / “prevents all”
- Certification claims
- Quantified ROI outcomes without a published methodology

## 5. Required Metadata for Each Artifact

Every external artifact must declare at top:

- Audience
- Purpose
- Confidence level (Draft / Review-Ready / Near-Final)
- Review channel (Internal / Partner / Public)
- Claim references (IDs or registry location)

## 6. Review Gates (Minimum)

- Terminology consistency gate
- Technical accuracy gate (Engineering reviewer required)
- Claim defensibility gate
- Security/compliance gate for risk-sensitive claims
- Cross-artifact consistency gate

## 7. CI Enforcement

CI will:

- Fail on prohibited phrases
- Fail on unregistered claims (if enforcement enabled)
- Warn on strong/moderate claims without evidence pointers
- Warn on comparative claims without a basis
- Produce a risk report on security/compliance language

## 8. Exceptions Process

Exceptions require:

- Written justification
- Explicit scope boundaries
- Owner + Engineering + Security approvals
- Expiration date and review schedule

Exceptions are tracked as governed items.

## 9. Release Channel Rules

- **Internal**: Draft allowed; warnings only.
- **Partner**: Review-Ready required; strong claims blocked unless evidenced.
- **Public**: Near-Final required; all claims registered and approved.

## 10. Change Management

This policy is versioned. Changes require:

- PR with rationale
- Approval from Marketing Governance and Engineering
- Security approval if changing prohibited/allowed categories
