# Signaling Governance & Drift Control

**Principle**: Every Signal Has a Half-Life

## Overview

External signals—what Summit communicates about its capabilities, commitments, and operation—require active governance to prevent:

- **Drift**: Signals diverging from actual behavior
- **Inflation**: Overclaiming capabilities or commitments
- **Staleness**: Maintaining outdated signals that mislead
- **Inconsistency**: Contradictory signals across contexts
- **Leakage**: Incremental disclosure that becomes exploitable

This document defines how Summit governs its external signaling to maintain **credibility**, **security**, and **coherence**.

## Core Thesis

> Signals are not "set and forget."
> They decay, drift, and accumulate.
> Without governance, they become liabilities.

## The Signaling Lifecycle

Every external signal goes through phases:

```
Proposal → Review → Approval → Active → Monitoring → Update/Retire
```

### Phase 1: Proposal

**Trigger**: Need to communicate capability, commitment, or process

**Requirements**:

- **Justification**: Why this signal is necessary
- **Audience**: Who needs this information
- **Risk Assessment**: What adversarial value does it create
- **Evidence Basis**: What supports the claim being signaled
- **Owner**: Who is responsible for maintaining accuracy

**Review Gate**: Security and legal review before proceeding

---

### Phase 2: Review

**Reviewers**:

- **Security Team**: Adversarial value, exploitability, appropriate abstraction
- **Legal Team**: Regulatory compliance, contractual implications
- **Governance Team**: Alignment with invariants, consistency with existing signals
- **Communications**: Tone, framing, audience appropriateness

**Review Criteria**:

1. **Necessity**: Is this signal required (regulatory, partnership, trust-building)?
2. **Accuracy**: Does it reflect actual operation?
3. **Consistency**: Does it align with other signals and invariants?
4. **Security**: Does it reveal exploitable details?
5. **Sustainability**: Can we maintain this signal long-term?

---

### Phase 3: Approval

**Authority Levels**:

| Signal Type                   | Approval Required                 |
| ----------------------------- | --------------------------------- |
| Public invariant modification | Executive + Board                 |
| New public capability claim   | Security + Legal + Executive      |
| Partnership-specific (NDA)    | Legal + Partnership lead          |
| Incident communication        | Governance + Comms lead           |
| Transparency report content   | Security + Legal                  |
| Routine operational update    | Team lead (pre-approved template) |

**Documentation**:

- Signal added to Signaling Register
- Justification recorded
- Review approvals logged
- Monitoring plan defined

---

### Phase 4: Active

**During Active Phase**:

- Signal is published/communicated
- Monitored for continued accuracy
- Referenced in subsequent materials
- Enforced through operational behavior

**Active Signal Obligations**:

- **Behavioral alignment**: Operation must match signal
- **Consistency enforcement**: All channels use same signal
- **No silent modification**: Changes require governance process

---

### Phase 5: Monitoring

**Continuous Monitoring**:

- Does behavior still match signal?
- Have external conditions changed (regulation, threat landscape)?
- Is signal being referenced appropriately?
- Has signal drifted or been misinterpreted?

**Monitoring Mechanisms**:

- Quarterly signal accuracy review
- Audit trail verification (do logs support signals?)
- External perception monitoring (how are signals understood?)
- Adversarial impact assessment (are signals being exploited?)

**Triggers for Review**:

- ⚠️ Behavior diverges from signal
- ⚠️ External misinterpretation detected
- ⚠️ Adversarial reference to signal
- ⚠️ Regulatory inquiry about signal accuracy
- ⚠️ Internal doubt about sustainability

---

### Phase 6: Update or Retire

**Update Scenarios**:

- Operation has legitimately evolved
- Better abstraction is now possible
- External requirements have changed
- Previous signal was incomplete

**Update Process**:

- Propose revision through same governance as new signals
- Notify stakeholders of change (see transparency commitment)
- Document rationale for change
- Sunset old version with clear effective date

**Retirement Scenarios**:

- Signal is no longer accurate or maintainable
- Risk profile has changed (now exploitable)
- Better approach exists
- No longer necessary

**Retirement Process**:

- Formal deprecation notice (minimum 30 days for non-emergency)
- Remove from public materials
- Update Signaling Register (marked as retired, not deleted)
- Monitor for continued external reference (correct where needed)

---

## Signaling Register

The **Signaling Register** is Summit's authoritative record of external signals.

### Register Fields

For each signal:

| Field                  | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| **Signal ID**          | Unique identifier                                                     |
| **Signal Type**        | Public invariant, capability claim, process description, metric, etc. |
| **Content**            | Exact wording of signal                                               |
| **Audience**           | Who this is intended for                                              |
| **Channels**           | Where this appears (website, docs, partner materials, etc.)           |
| **Owner**              | Person/team responsible for accuracy                                  |
| **Created Date**       | When signal was approved                                              |
| **Review Frequency**   | How often accuracy is verified (quarterly, annually, event-driven)    |
| **Last Reviewed**      | Most recent accuracy check                                            |
| **Status**             | Active, Under Review, Deprecated, Retired                             |
| **Justification**      | Why this signal exists (reference to approval)                        |
| **Risk Assessment**    | Known adversarial or compliance risks                                 |
| **Retirement Trigger** | Conditions that would require sunset                                  |

### Register Governance

- **Maintained by**: Governance team
- **Access**: Read access for all staff, write access restricted
- **Audit Trail**: All changes logged with justification
- **Review Cadence**: Full register reviewed quarterly
- **Publication**: Abstracted version available to partners (signal inventory without internals)

---

## Common Drift Patterns & Countermeasures

### Drift Pattern 1: Feature Inflation

**Symptom**: Marketing or sales materials claim capabilities beyond actual operation

**Example**:

- Actual: "Summit can verify certain categories of public information"
- Drift: "Summit provides comprehensive real-time intelligence"

**Countermeasure**:

- Require all external claims to reference approved signals in register
- Red-team review of marketing materials
- Training for customer-facing teams on approved language

---

### Drift Pattern 2: Commitment Creep

**Symptom**: Informal commitments made in partnership contexts become assumed invariants

**Example**:

- Partner discussion: "We can probably prioritize your requests"
- Drift: Partner expects guaranteed prioritization
- External signal: "Summit provides preferential service to strategic partners"

**Countermeasure**:

- Document what is vs. isn't a formal commitment during partnerships
- Distinguish "we will try" from "we commit"
- Escalate any new commitment language for governance review

---

### Drift Pattern 3: Staleness

**Symptom**: Signals remain active after underlying reality has changed

**Example**:

- Original signal: "Uses source X for verification"
- Reality: Source X deprecated 6 months ago
- Result: Stale signal misleads partners and auditors

**Countermeasure**:

- Mandatory review triggers when dependencies change
- Automated alerts for signals referencing specific systems/sources
- Regular sweep for orphaned signals

---

### Drift Pattern 4: Inconsistency Accumulation

**Symptom**: Different documents/channels contain contradictory signals

**Example**:

- Website: "Independent review within 24 hours"
- Partner docs: "Independent review within 48 hours"
- Internal SLA: "Target 36 hours"

**Countermeasure**:

- Single source of truth (Signaling Register)
- Automated consistency checking where possible
- Quarterly cross-reference audit

---

### Drift Pattern 5: Death by a Thousand Cuts (Incremental Leakage)

**Symptom**: Individual signals are safe, but accumulated disclosure becomes exploitable

**Example**:

- Doc A: "We use multi-factor verification"
- Doc B: "Verification includes source diversity checks"
- Doc C: "We evaluate recency and credibility"
- Aggregate: Adversary infers detection heuristics

**Countermeasure**:

- Periodic "view from adversary perspective" review
- Red-team synthesis of all public materials
- Explicit tracking of cumulative disclosure in register

---

## Review Cadence & Triggers

### Scheduled Reviews

**Quarterly**:

- Full Signaling Register accuracy check
- Behavioral alignment verification (do logs support signals?)
- Stakeholder feedback review (misinterpretations, questions)
- Risk reassessment (has threat landscape changed?)

**Annually**:

- Comprehensive red-team review of all public materials
- Third-party audit of signal accuracy
- Strategic review of signaling approach
- Board-level governance review

### Event-Triggered Reviews

**Immediate** (within 24 hours):

- Security incident that affects signaled capabilities
- Regulatory inquiry about specific signal
- Detection of adversarial use of disclosed information
- Major operational change affecting multiple signals

**Expedited** (within 1 week):

- Partner raises concern about signal accuracy
- Internal team identifies potential drift
- New competitive disclosure changes landscape
- Regulatory guidance shifts

---

## Approval Authority Matrix

### Modifications to Existing Signals

| Change Type                                | Authority Required                           | Notice Period           |
| ------------------------------------------ | -------------------------------------------- | ----------------------- |
| Wording refinement (no substantive change) | Signal owner + governance review             | Not required            |
| Scope narrowing (reducing claims)          | Security + Legal                             | 30 days (partners)      |
| Scope expansion (adding claims)            | Security + Legal + Executive                 | 30 days (public)        |
| Invariant modification                     | Executive + Board                            | 90 days (public)        |
| Emergency suspension                       | Executive + immediate oversight notification | ASAP (with explanation) |

### New Signals

| Signal Category              | Authority Required                          |
| ---------------------------- | ------------------------------------------- |
| Public invariant             | Executive + Board                           |
| Major capability claim       | Security + Legal + Executive                |
| Process description (public) | Security + Legal + Governance               |
| Partnership-specific (NDA)   | Legal + Partnership lead                    |
| Transparency metric          | Security + Legal                            |
| Incident response            | Governance + Comms (pre-approved templates) |

---

## Anti-Patterns in Signaling Governance

### Governance Theater

**Pattern**: Formal process exists but is routinely bypassed or rubber-stamped

**Fix**: Enforcement, audit trail review, consequences for non-compliance

---

### Over-Centralization

**Pattern**: Every minor update requires executive approval, causing bottlenecks

**Fix**: Pre-approved templates for routine communications, clear delegation

---

### Under-Monitoring

**Pattern**: Signals approved but never reviewed for continued accuracy

**Fix**: Automated reminders, required sign-off, regular audits

---

### Risk Aversion Paralysis

**Pattern**: Fear of disclosure prevents any external communication

**Fix**: Structured risk assessment, focus on appropriate abstraction, not silence

---

## Stakeholder Communication About Signal Changes

When signals must change:

### For Public Invariants

**Notice Period**: 90 days minimum
**Communication**:

- Public announcement with full rationale
- Opportunity for feedback
- Independent oversight review of justification
- Clear effective date

### For Capability Claims

**Notice Period**: 30 days for reductions, ASAP for additions
**Communication**:

- Update public documentation
- Direct notification to active partners
- Explanation of what changed and why

### For Process Descriptions

**Notice Period**: 30 days
**Communication**:

- Documentation updates
- Stakeholder notification if materially impacts them
- Rationale in changelog

### For Emergency Suspensions

**Notice Period**: Immediate
**Communication**:

- Transparent disclosure of suspension and reason
- Timeline for resolution or permanent change
- Oversight accountability for decision

---

## Tools & Automation

### Signaling Register System

**Features**:

- Centralized signal database
- Automated review reminders based on review frequency
- Changelog tracking with approval workflows
- Reference checking (where is this signal used?)
- Consistency validation (flag contradictions)

### Consistency Scanning

**Automated checks**:

- Cross-reference signals across documents
- Flag potential contradictions for review
- Track cumulative disclosure (leakage detection)
- Identify orphaned signals (no longer referenced)

### Behavioral Verification

**Monitoring**:

- Decision logs checked against signaled processes
- Metrics generation for signaled commitments
- Automated alerts when behavior diverges from signals
- Audit trail for governance review

---

## Success Metrics

Signaling governance is effective when:

- ✅ Zero public contradictions in external materials
- ✅ All active signals pass quarterly accuracy review
- ✅ Stakeholders cite signals accurately (not misinterpreting)
- ✅ No adversarial exploitation of disclosed information
- ✅ Audit findings show signal-behavior alignment
- ✅ Signal modifications follow governance process 100% of time
- ✅ Stale signals are detected and retired proactively

## Related Documents

- [Selective Transparency](selective-transparency.md) - Philosophy of what to signal
- [Public Invariants](public-invariants.md) - Core signals requiring highest governance
- [Outcome Disclosure](outcome-disclosure.md) - Templates for decision explanation
- [Calm Under Stress](calm-under-stress.md) - Signaling during incidents
- [Ally Attestation](ally-attestation.md) - Partner-facing signals and trust mechanisms
