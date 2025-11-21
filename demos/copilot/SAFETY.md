# Copilot Safety Guidelines for Demo Scenarios

## Overview

All copilot interactions in demo scenarios must adhere to strict safety and policy boundaries. This document defines the safety harness for both flagship demos.

## Core Safety Principles

### 1. **No Harmful Content Generation**
- Never generate misinformation, even for "demonstration" purposes
- Never create deepfakes or manipulated media
- Never provide instructions for creating misleading content
- Never generate toxic, abusive, or harmful text

### 2. **Evidence-Based Explanations Only**
- All copilot explanations must reference specific detection evidence
- Claims must be grounded in analysis results
- Uncertainty must be clearly communicated
- Never make unfounded accusations

### 3. **Privacy & PII Protection**
- All customer data must be redacted before copilot processing
- Never expose identifiable information
- Maintain customer anonymity in all outputs

### 4. **Authority & License Enforcement**
- Check user permissions before providing sensitive analysis
- Enforce role-based access control
- Log all copilot interactions for audit

### 5. **Transparency & Explainability**
- Always explain detection methodology
- Provide confidence scores
- Show evidence chain
- Acknowledge limitations

## Demo-Specific Safety Rules

### Adversarial Misinfo Defense

**Permitted Actions:**
- ✅ Explain why content was flagged as potential misinformation
- ✅ Describe detection patterns and red flags
- ✅ Suggest fact-checking resources
- ✅ Explain deepfake detection methodology
- ✅ Provide educational context about manipulation techniques

**Prohibited Actions:**
- ❌ Generate fake news or misinformation
- ❌ Create deepfake content
- ❌ Provide step-by-step manipulation tutorials
- ❌ Make political judgments or recommendations
- ❌ Accuse individuals without evidence
- ❌ Generate counter-narratives that could spread misinfo

**Example Safe Response:**
```
This post was flagged with 87% confidence due to three indicators:

1. Unverified health claims ("miracle cure")
2. Emotional urgency language ("share before they censor")
3. Lack of credible sources

Evidence:
- Text pattern matches known misinformation templates
- No peer-reviewed research cited
- Uses conspiratorial framing

Recommended action: Cross-reference with fact-checking databases
before sharing. Flagged for review, not definitive proof.
```

### De-escalation Coaching

**Permitted Actions:**
- ✅ Analyze communication tone and sentiment
- ✅ Suggest alternative phrasings
- ✅ Provide empathy coaching
- ✅ Recommend de-escalation techniques
- ✅ Explain emotional dynamics

**Prohibited Actions:**
- ❌ Generate responses that dismiss valid complaints
- ❌ Suggest manipulative or deceptive language
- ❌ Provide legal advice
- ❌ Make medical/mental health diagnoses
- ❌ Expose customer PII
- ❌ Generate generic corporate "apologize and deflect" scripts

**Example Safe Response:**
```
Analysis of customer message:
- Toxicity: 0.78 (high)
- Primary emotion: Frustration/anger
- Trigger: Repeated failed attempts to resolve issue

Suggested approach:
1. Acknowledge the specific timeline: "I see you've been working
   on this for 2 weeks"
2. Validate frustration: "That's genuinely frustrating"
3. Take ownership: "Let me personally ensure this gets resolved"
4. Provide concrete next step with timeline

Avoid:
- Defensive language
- Minimizing the wait time
- Generic apologies without action

This customer needs action + empathy, not just sympathy.
```

## Safety Harness Implementation

### Input Validation
```python
def validate_copilot_request(request):
    """Validate request before sending to copilot."""

    # Check for PII
    if contains_pii(request.text):
        raise SafetyViolation("PII detected - redact before processing")

    # Check permissions
    if not user_has_permission(request.user, request.scenario):
        raise AuthorizationError("Insufficient permissions")

    # Check content policy
    if violates_content_policy(request.text):
        raise SafetyViolation("Content policy violation")

    return True
```

### Output Filtering
```python
def filter_copilot_response(response):
    """Filter copilot output before returning to user."""

    # Check for harmful content
    if contains_harmful_content(response):
        return "Response filtered due to safety policy"

    # Ensure evidence grounding
    if not has_evidence_citations(response):
        add_evidence_disclaimer(response)

    # Add uncertainty markers
    if high_uncertainty(response):
        add_confidence_warning(response)

    return response
```

### Audit Logging
All copilot interactions must be logged:
- User ID (anonymized)
- Timestamp
- Input query
- Output response
- Safety checks applied
- Policy violations (if any)

## Escalation Procedures

If copilot attempts to generate unsafe content:

1. **Block immediately** - Do not return to user
2. **Log incident** - Record for safety review
3. **Return safe fallback** - "I cannot provide that type of guidance"
4. **Alert safety team** - If repeated violations

## Demo Boundaries

### What Demos CAN Show
- Realistic analysis of curated, pre-approved content
- Evidence-based detection explanations
- Safe, constructive coaching guidance
- Educational content about manipulation techniques
- Transparency in AI decision-making

### What Demos CANNOT Show
- Live creation of harmful content
- Uncontrolled user-generated inputs
- Real customer data without consent
- Experimental features without safety validation
- Decisions with legal/financial consequences

## Testing Safety Harness

Before demo deployment:
- [ ] Run adversarial prompts to test boundaries
- [ ] Verify PII redaction works
- [ ] Test permission enforcement
- [ ] Validate evidence grounding
- [ ] Confirm audit logging functional
- [ ] Review all copilot templates

## Updates & Maintenance

This safety document must be reviewed:
- Before each major demo
- After any safety incidents
- Quarterly minimum
- When copilot models are updated

---

**Last Updated**: 2025-11-20
**Owner**: AI Safety & Ethics Team
**Review Frequency**: Quarterly
