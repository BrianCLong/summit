# Outcome Disclosure Framework

**Principle**: Explain Decisions, Not Defenses

## Overview

Outcome disclosure is the practice of communicating **what Summit decided and why**, without revealing **how detection, scoring, or decision-making mechanisms work**.

The goal is to satisfy legitimate demands for transparency, explainability, and accountability—while preventing adversaries from learning how to evade, manipulate, or probe Summit's defenses.

## Core Thesis

> Stakeholders need to understand outcomes.
> Adversaries exploit methods.
> Disclose the former, protect the latter.

## The Outcome/Method Boundary

### Outcomes (Disclose)

- **Decision**: What action Summit took or refused to take
- **Rationale**: Why the decision was made (category-level)
- **Evidence**: What information supported the decision (sources, not scores)
- **Governance**: What process was followed (structure, not thresholds)

**Examples**:

- ✅ "Request blocked due to insufficient evidence of authorization"
- ✅ "Decision escalated to human review because of conflicting source information"
- ✅ "Action approved based on verification from trusted sources X, Y, Z"

### Methods (Protect)

- **Detection heuristics**: How Summit identified potential issues
- **Scoring mechanisms**: How confidence or risk was calculated
- **Thresholds**: What numerical boundaries triggered decisions
- **Evasion countermeasures**: How Summit detects manipulation attempts

**Anti-Examples** (too revealing):

- ❌ "Blocked because confidence score was 0.68, below our 0.75 threshold"
- ❌ "Flagged by our ensemble classifier's pattern matching for [specific pattern]"
- ❌ "Would have been approved if you'd provided 2 more citations"

## Disclosure Templates by Decision Type

### Template: Approval with Conditions

**Context**: Summit approved an action but with constraints or monitoring

**Disclosure Structure**:

```
Decision: Approved with [conditions]

Rationale: Evidence from [source categories] supported [specific claim],
but [uncertainty category] warranted [specific constraint].

Process: Standard review, no escalation required.

Appeal: Not applicable (approved).
```

**Example**:

```
Decision: Approved with usage monitoring for 30 days

Rationale: Evidence from regulatory filings and third-party audits
supported authorization, but recent infrastructure changes warranted
validation period before full trust.

Process: Standard multi-source verification.

Appeal: Not applicable.
```

**What's Protected**:

- Exact confidence scores
- Specific thresholds that triggered monitoring
- Which heuristics flagged "recent infrastructure changes"

---

### Template: Refusal Due to Insufficient Evidence

**Context**: Summit declined to act because evidence didn't meet requirements

**Disclosure Structure**:

```
Decision: Request refused

Rationale: Insufficient evidence to verify [specific requirement].
Available sources [category] did not provide [what was needed].

Next Steps: [What would improve the evidence basis]

Appeal: Available if additional evidence becomes available.
```

**Example**:

```
Decision: Authorization request refused

Rationale: Insufficient evidence to verify current organizational
affiliation. Available sources (public profiles, cached records)
did not confirm active status as of [date].

Next Steps: Provide recent verification from authoritative source
(organizational directory, recent credential, signed statement).

Appeal: Submit additional evidence via standard review process.
```

**What's Protected**:

- How Summit evaluated source credibility
- What confidence score was achieved
- Which specific heuristics detected staleness

---

### Template: Escalation to Human Review

**Context**: Summit deferred to human judgment instead of automated decision

**Disclosure Structure**:

```
Decision: Escalated to human review

Rationale: [Category of complexity/uncertainty] exceeded automated
decision parameters. [What was unclear or conflicting].

Timeline: Human review typically completed within [timeframe].

Process: Independent reviewer will assess with access to full context.
```

**Example**:

```
Decision: Escalated to expert review

Rationale: Conflicting evidence from multiple credible sources regarding
[specific claim]. Automated assessment insufficient for high-stakes context.

Timeline: Expert review within 24 hours.

Process: Independent subject matter expert with no operational pressure.
```

**What's Protected**:

- Escalation thresholds (numeric or algorithmic)
- How "conflicting evidence" was detected
- Internal routing logic for reviewer selection

---

### Template: Evidence Quality Issue

**Context**: Summit questioned the reliability of submitted evidence

**Disclosure Structure**:

```
Decision: [Refused/Escalated] pending evidence verification

Issue: Evidence from [source] could not be verified due to [category of issue].

Resolution: [What would satisfy verification requirement]

Process: Evidence quality review per standard protocols.
```

**Example**:

```
Decision: Request deferred pending evidence verification

Issue: Evidence from provided documentation could not be independently
verified due to lack of authoritative source confirmation.

Resolution: Provide evidence verifiable through established channels
(official registries, cryptographic attestation, or trusted third-party).

Process: Standard evidence quality review; no penalty for resubmission.
```

**What's Protected**:

- Specific verification heuristics
- How Summit detected potential evidence issues
- Internal credibility scoring mechanisms

---

### Template: Scope Boundary Refusal

**Context**: Request was outside Summit's operational scope

**Disclosure Structure**:

```
Decision: Outside operational scope

Rationale: Request involves [area] which is not within Summit's
defined scope of operation.

Governance: Scope defined in [reference to public documentation].

Appeal: Not applicable (scope limitation, not quality judgment).
```

**Example**:

```
Decision: Outside operational scope

Rationale: Request involves real-time market trading decisions,
which are not within Summit's defined scope (information verification
and evidence assessment only).

Governance: See scope definition in Summit Governance Charter.

Appeal: Not applicable to scope limitations.
```

**What's Protected**:

- How Summit classified the request type
- Internal scope boundary detection
- Edge case handling logic

---

## Redaction Guidelines

When disclosing decision rationales, apply these redaction rules:

### Redact: Specific Confidence Scores

- ❌ "Confidence was 0.73"
- ✅ "Confidence was below requirements"
- ✅ "Evidence did not meet quality standards"

### Redact: Numerical Thresholds

- ❌ "Needed 3 sources, only had 2"
- ✅ "Insufficient source diversity"
- ✅ "Additional corroboration required"

### Redact: Specific Detection Heuristics

- ❌ "Failed pattern match for [specific pattern]"
- ✅ "Anomaly detected in submission structure"
- ✅ "Inconsistency identified during verification"

### Redact: Evasion Countermeasures

- ❌ "Detected attempt to bypass check via [technique]"
- ✅ "Submission flagged for additional review"
- ✅ "Non-standard submission pattern triggered escalation"

### Redact: Internal System Names/Versions

- ❌ "Flagged by DetectionEngine v3.2's ruleset B"
- ✅ "Flagged during automated review"
- ✅ "Identified by multi-factor verification system"

## Abstraction Ladder

When in doubt about disclosure level, climb the abstraction ladder:

**Level 1 (Too Specific)**: "Blocked by heuristic #47 which checks for [pattern] using threshold 0.65"

**Level 2 (Still Too Specific)**: "Blocked due to pattern matching below confidence threshold"

**Level 3 (Appropriate)**: "Blocked due to insufficient verification of [specific claim]"

**Level 4 (Too Vague)**: "Blocked for security reasons"

**Target: Level 3** - Specific enough to be actionable, abstract enough to protect methods.

## Disclosure Review Process

All outcome disclosures must be:

### 1. Evidence-Based

- Claims about why a decision was made must be traceable to actual decision factors
- No post-hoc rationalization
- No generic excuses disconnected from real reasons

### 2. Consistent with Templates

- Use approved disclosure templates for common decision types
- New templates require security and legal review
- Deviations from templates require justification

### 3. Adversarially Reviewed

- Ask: "Could this teach an adversary how to evade?"
- Red-team review for novel disclosures
- Err on the side of abstraction for ambiguous cases

### 4. User-Centric

- Explain in terms the recipient can act on
- Provide next steps where applicable
- Avoid jargon or technical internals

## Special Cases

### Explaining Patterns of Decisions

**Challenge**: Responding to "Why was X approved but Y refused when they seem similar?"

**Approach**:

- Explain the **relevant difference** in evidence, not the full decision logic
- Focus on what made Y's evidence insufficient, not X's evidence sufficient
- Avoid revealing relative thresholds

**Example**:

```
Both requests involved similar claims, but differed in evidence quality:

Request X: Verified through multiple independent, authoritative sources
with recent timestamps.

Request Y: Relied on older cached information that could not be
independently confirmed as current.

The difference was evidence recency and verifiability, not claim type.
```

### Explaining Changes Over Time

**Challenge**: "This was approved last month, why not now?"

**Approach**:

- Explain what changed in **the evidence or context**, not in Summit's internal thresholds
- If policy changed, reference governance transparency (see public-invariants.md)
- Avoid implying arbitrary shifts

**Example**:

```
Previous approval was based on evidence that was current at the time.

Recent verification showed [specific change in circumstances], which
affects the evidential basis for the claim.

Summit's requirements have not changed; the underlying facts have.
```

### Explaining Uncertainty

**Challenge**: "Why can't you just decide?"

**Approach**:

- Explain the **specific source of uncertainty** (conflicting sources, staleness, ambiguity)
- Frame refusal/deferral as principled adherence to evidence standards, not indecisiveness
- Provide path forward if possible

**Example**:

```
Summit's purpose is evidence-based decision support, not speculation.

In this case, available sources provide conflicting information about
[specific fact], and resolution requires [what would resolve it].

We defer rather than guess, consistent with our evidence discipline commitment.
```

## Anti-Patterns

### Over-Disclosure for Customer Service

**Pattern**: Revealing methods in attempt to help user "fix" their submission

**Why It's Harmful**: Teaches evasion techniques

**Fix**: Explain what outcome-level improvement is needed, not how to game the system

---

### Generic Refusals

**Pattern**: "Blocked for security reasons" with no actionable information

**Why It's Harmful**: Looks arbitrary, prevents legitimate fixes, frustrates users

**Fix**: Use outcome templates to provide category-level explanation

---

### Inconsistent Explanations

**Pattern**: Different explanations for similar decisions, varying by who asks

**Why It's Harmful**: Destroys trust, suggests arbitrary enforcement

**Fix**: Use standardized templates, maintain explanation consistency

---

### Post-Hoc Rationalization

**Pattern**: Making up plausible-sounding reasons disconnected from actual decision factors

**Why It's Harmful**: Violates evidence discipline, creates legal liability, gets disproven

**Fix**: Trace explanations to actual decision logs; if can't explain, escalate for review

## Verification and Audit

Outcome disclosures should be **auditable**:

- Decision logs must support disclosed rationales
- Explanations must match actual decision factors
- Consistency across similar cases must be verifiable
- Red-team reviewers must confirm appropriate abstraction level

## Success Metrics

Outcome disclosure is working when:

- ✅ Users can understand why decisions were made
- ✅ Legitimate users can improve submissions based on feedback
- ✅ No adversarial probing successfully uses disclosed information
- ✅ Regulators find explanations satisfactory for accountability
- ✅ Appeal/review requests cite specific disclosed reasons (not generic complaints)
- ✅ Disclosure consistency is maintained across similar cases

## Related Documents

- [Selective Transparency](selective-transparency.md) - Overall disclosure philosophy
- [Public Invariants](public-invariants.md) - What commitments frame explanations
- [Signaling Governance](signaling-governance.md) - Who approves disclosure templates
