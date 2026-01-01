# Selective Transparency

**Principle**: Auditable Without Being Instructive

## Overview

Selective transparency is the practice of making Summit's governance, decision-making, and oversight mechanisms visible to appropriate stakeholders without disclosing exploitable implementation details.

The goal is to satisfy regulatory requirements, build trust with partners, and demonstrate accountability—while preventing adversaries from learning how to circumvent defenses.

## Core Thesis

> Not all transparency is equal.
> The right information to the right audience at the right level of abstraction.

## Transparency Boundaries

Summit distinguishes three zones of disclosure:

### 1. Public Signals

**Purpose**: Build trust, satisfy regulatory expectations, demonstrate seriousness

**Appropriate Content**:
- High-level governance principles
- Non-negotiable invariants (see public-invariants.md)
- Oversight mechanisms (without thresholds)
- Evidence discipline commitments
- Appeal and review processes (structure, not criteria)

**Examples**:
- "All high-stakes decisions require evidence citations"
- "Independent oversight reviews decision patterns quarterly"
- "Users can appeal decisions through structured review"

**Anti-Examples** (too revealing):
- ❌ "Decisions scoring below 0.73 on confidence trigger review"
- ❌ "We use ensemble voting with 5 independent classifiers"
- ❌ "Appeal threshold is 3 user reports within 24 hours"

### 2. Restricted Disclosures

**Purpose**: Enable partnership integration, satisfy auditor due diligence, support regulatory inquiry

**Appropriate Content**:
- Implementation architecture (abstracted)
- Detection categories (not specific heuristics)
- Escalation workflows (structure, not thresholds)
- Audit trail capabilities
- Compliance attestations

**Access Control**:
- Shared under NDA
- Limited to specific partnership contexts
- Versioned and tracked
- Subject to review before renewal

**Examples**:
- "Decision pipeline includes multi-stage verification"
- "System maintains immutable audit logs with cryptographic integrity"
- "Escalation paths separate automated screening from human review"

### 3. Internal-Only Mechanisms

**Purpose**: Maintain operational security, preserve defensive advantage

**Content That Must Remain Opaque**:
- Specific detection heuristics
- Threshold values and confidence scores
- Evasion detection techniques
- Rate limiting parameters
- Pattern matching algorithms
- Adversarial robustness mechanisms

**Protection Mechanisms**:
- Need-to-know access controls
- Regular review for accidental exposure
- Redaction protocols for public-facing materials
- Training for staff on disclosure boundaries

## Transparency Boundary Map

```
┌─────────────────────────────────────────────────────┐
│ PUBLIC SIGNALS                                      │
│ • Governance principles                             │
│ • Invariants & refusal commitments                  │
│ • Oversight structure                               │
│ • Evidence discipline                               │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ RESTRICTED DISCLOSURES (NDA, Auditors)              │
│ • Architecture abstractions                         │
│ • Audit capabilities                                │
│ • Compliance attestations                           │
│ • Integration specifications                        │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ INTERNAL-ONLY (Need-to-Know)                        │
│ • Detection heuristics                              │
│ • Threshold values                                  │
│ • Evasion countermeasures                           │
│ • Rate limiting parameters                          │
└─────────────────────────────────────────────────────┘
```

## Disclosure Decision Framework

Before disclosing any information about Summit's operation, evaluate:

### 1. Necessity Test
- Is this disclosure required by regulation?
- Does it materially improve partner trust or integration?
- Is there a less-revealing alternative?

### 2. Adversarial Value Test
- Could an adversary use this to probe for weaknesses?
- Does it reveal decision thresholds or detection boundaries?
- Could it be combined with other public information to infer internals?

### 3. Abstraction Ladder Test
- Can we disclose the outcome without the method?
- Can we describe the category without the specific heuristic?
- Can we show the structure without the parameters?

### 4. Audit Trail Test
- Is this disclosure documented?
- Has it been reviewed by security and legal?
- Is there a justification on record?

## Operationalizing Selective Transparency

### For External Communications
1. **Default to outcome-only disclosure** (see outcome-disclosure.md)
2. **Abstract mechanisms into categories**: "multi-factor verification" not "5-stage pipeline with thresholds X, Y, Z"
3. **Focus on governance, not tactics**: "Independent oversight" not "Oversight triggers when confidence < 0.8"
4. **Emphasize structure over specifics**: "Evidence required" not "Minimum 3 citations with credibility score > 0.7"

### For Partnership Materials
1. **Use NDA-gated tiers** for technical integration
2. **Provide abstracted APIs** without revealing internal decision logic
3. **Offer attestations** rather than implementation details
4. **Enable verification** without requiring transparency of method

### For Regulatory Inquiry
1. **Proactively provide governance documentation**
2. **Offer structured audit access** rather than reactive disclosure
3. **Explain categories of control** without revealing specific implementations
4. **Demonstrate oversight mechanisms** through process documentation

## Anti-Patterns to Avoid

### Security Theater
- Making claims about security without demonstrating structure
- "We take security seriously" without showing governance

**Fix**: Show structure (oversight, evidence discipline, audit trails) without revealing tactics

### Over-Disclosure
- Publishing detailed architecture diagrams with thresholds
- Sharing confidence scores and decision boundaries
- Documenting specific heuristics in public materials

**Fix**: Use abstraction ladder—describe capabilities, not implementations

### Marketing-Driven Disclosure
- Revealing implementation details to differentiate from competitors
- Publishing research that exposes defensive mechanisms
- Creating technical content that doubles as attack guidance

**Fix**: Separate technical disclosure from marketing; review all content through adversarial lens

## Review and Governance

All external-facing materials that discuss Summit's operation must be:

1. **Reviewed by security team** for exploitable disclosure
2. **Approved by legal** for regulatory compliance
3. **Documented in signaling register** (see signaling-governance.md)
4. **Periodically re-reviewed** as threat landscape evolves

## Success Metrics

Selective transparency is working when:

- ✅ Regulators express confidence in governance without requesting sensitive details
- ✅ Partners successfully integrate without requiring access to internal decision logic
- ✅ Public perception is "serious and well-governed" not "opaque and defensive"
- ✅ No adversarial probing attempts reference disclosed information
- ✅ Audit requests focus on outcomes and governance, not specific thresholds

## Related Documents

- [Public Invariants](public-invariants.md) - What Summit commits to publicly
- [Outcome Disclosure](outcome-disclosure.md) - How to explain decisions without revealing methods
- [Signaling Governance](signaling-governance.md) - Managing disclosure lifecycle
