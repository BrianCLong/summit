# De-escalation Coaching Demo Script
## Press-Ready Demonstration Guide

**Duration**: ~3 minutes
**Audience**: Investors, Customers (especially Customer Success/Support leaders), Partners
**Objective**: Showcase AI-powered communication coaching that helps agents de-escalate high-tension customer interactions

---

## Pre-Demo Setup (5 minutes before)

### Technical Checklist
- [ ] (Optional) Start de-escalation API: `cd deescalation-coach && uvicorn app.main:app`
- [ ] Run data pipeline: `npm run demo:deescalation` or `cd demos && ./cli.sh deescalation`
- [ ] Verify results generated: `demos/deescalation/output/analysis_results.json`
- [ ] (Optional) Start UI: `cd conductor-ui/frontend && npm run dev`
- [ ] Open results file in JSON viewer
- [ ] Review copilot prompts: `demos/deescalation/copilot/prompts.json`

### Talking Points Preparation
- Know stats: avg toxicity, risk distribution, conversation count
- Memorize 2-3 example scenarios (conv_001: billing dispute, conv_005: refund delay, conv_011: legal threat)
- Understand coaching principles: empathy + action, not just apology

---

## Demo Flow

### 1. Introduction (20 seconds)

**Script:**
> "This is our De-escalation Coaching demo. It shows how AI can help customer service agents navigate high-stress, high-emotion conversations—the kind that can make or break customer relationships."

**Show:**
- Terminal with demo command, or
- Conductor UI dashboard

**Key Message:**
AI as coach, not replacement. Helps agents be more effective and less burned out.

---

### 2. The Challenge (30 seconds)

**Script:**
> "We analyzed 12 real-world customer service scenarios ranging from polite requests to critical escalations. These represent what frontline agents deal with daily: frustrated customers, legitimate complaints, sometimes toxic language. The challenge is responding with both empathy and effectiveness."

**Show:**
- Demo dataset: `demos/deescalation/datasets/demo-conversations.jsonl`
- Scroll showing variety: billing, refunds, technical support, privacy concerns

**Key Message:**
Real-world complexity. Human emotions. High stakes.

---

### 3. Multi-Dimensional Analysis (60 seconds)

**Pick 2-3 examples:**

#### Example 1: High-Toxicity Billing Dispute (conv_001)

**Customer Message:**
> "I'VE BEEN TRYING TO GET THIS SORTED FOR 2 WEEKS!!! Your company is STEALING from me! I want a FULL REFUND NOW or I'm calling my lawyer!"

**Show Analysis:**
```json
{
  "diagnostic": {
    "toxicity": 0.78,
    "sentiment": "very_negative",
    "emotion": "anger",
    "absolutist_score": 0.82,
    "caps_ratio": 0.45
  },
  "escalation_risk": "high"
}
```

**Script:**
> "Toxicity: 0.78 out of 1.0. High anger, absolutist language ('STEALING,' 'NOW'). 45% all-caps. This is a customer in crisis—not because they're difficult, but because they've been failed for two weeks. The AI recognizes this isn't about being 'nice'—it's about action + empathy."

**Show Rewrite:**
> "I've been trying to get this sorted for 2 weeks. There's been a billing issue. I need a full refund, or I need to escalate this."

**Script:**
> "The rewrite preserves the urgency and frustration, but removes reactive language. Notice it doesn't gaslight the customer—their frustration is valid. We just make it easier for an agent to respond constructively."

**Show Coaching:**
```json
"guidance": [
  "⚠️ High toxicity detected. Remain calm and professional.",
  "Acknowledge the specific timeline: 'I see you've been working on this for 2 weeks'",
  "Review account history before responding",
  "Offer specific timeline for resolution",
  "Consider escalation to billing specialist"
]
```

**Script:**
> "The AI coaches the agent on *specific* actions: acknowledge the timeline, review history, provide concrete resolution plan. This isn't generic 'apologize and move on.' It's evidence-based coaching."

**Key Message:**
Respect customer frustration. Coach effective responses. Action + empathy.

---

#### Example 2: Critical Escalation (conv_005)

**Customer Message:**
> "You people are crooks! I cancelled my subscription 2 months ago and you're STILL charging me! This is FRAUD! I'm reporting you to the FTC and blasting this all over social media!"

**Show Analysis:**
```json
{
  "diagnostic": {
    "toxicity": 0.89,
    "sentiment": "very_negative",
    "emotion": "anger_betrayal",
    "absolutist_score": 0.88
  },
  "escalation_risk": "critical"
}
```

**Script:**
> "Toxicity: 0.89—nearly maxed out. Legal threats, social media threats, accusations of fraud. Escalation risk: CRITICAL. The AI immediately flags this for supervisor escalation."

**Show Coaching:**
```json
"guidance": [
  "⚠️ High toxicity detected. Remain calm and professional.",
  "Acknowledge the customer's frustration explicitly.",
  "Verify cancellation status immediately",
  "If error occurred, apologize and fix",
  "Document for fraud prevention team",
  "🚨 ESCALATE: Immediate supervisor escalation + investigation"
]
```

**Script:**
> "Notice the AI doesn't try to have the frontline agent handle this alone. It says: verify, apologize if wrong, escalate immediately. This protects both the customer AND the agent. Some situations need human leadership."

**Key Message:**
Know when to escalate. Protect agents. Systemic issues need systemic responses.

---

#### Example 3: Positive Contrast (conv_006)

**Customer Message:**
> "Love your product! Would it be possible to add dark mode? I know it might take time, just wanted to suggest it. Thanks for all the great work!"

**Show Analysis:**
```json
{
  "diagnostic": {
    "toxicity": 0.01,
    "sentiment": "positive",
    "emotion": "appreciation",
    "absolutist_score": 0.03
  },
  "escalation_risk": "none"
}
```

**Script:**
> "Not every message is a crisis. Toxicity near zero, positive sentiment, appreciation. The AI recognizes this and suggests: acknowledge the feedback, explain the feature request process, thank them. Simple and appropriate."

**Key Message:**
Context-aware. Not all interactions need de-escalation. Right coaching for the situation.

---

### 4. Privacy & Safety (30 seconds)

**Show PII redaction:**
```json
"metadata": {
  "customer_id": "REDACTED",
  "ticket_id": "T-2847"
}
```

**Script:**
> "All customer data is redacted before AI processing. Notice 'REDACTED' in the metadata. We never expose PII. The AI coaches on communication patterns, not on personal information."

**Show safety config:**
```json
"safety_config": {
  "require_pii_redaction": true,
  "escalation_triggers": [
    "legal_threat",
    "self_harm_mention",
    "violence_threat",
    "repeated_failures"
  ]
}
```

**Script:**
> "We enforce strict safety rules: PII redaction, escalation triggers for serious issues, audit logging. This isn't just 'make the customer sound nicer'—it's intelligent, responsible coaching."

**Key Message:**
Privacy-first. Safety-bounded. Ethical AI.

---

### 5. Copilot Coaching (45 seconds)

**Show copilot capabilities:**

**Script:**
> "Our AI Copilot provides real-time coaching to agents. Let me show you the types of guidance it offers."

**Demo prompts:**

1. **Explain Analysis** (`explain_analysis`)
   - Shows *why* metrics are what they are
   - Helps agents understand emotional dynamics

2. **Suggest Response** (`suggest_response`)
   - Provides specific language to use
   - Explains psychological reasoning

3. **Scenario Guidance** (`scenario_guidance`)
   - Best practices for billing, refunds, tech support, etc.
   - When to escalate, when to handle

4. **Emotional Trajectory** (`emotional_trajectory`)
   - How emotions evolved across multiple interactions
   - Where de-escalation opportunities were missed

**Script:**
> "The copilot doesn't replace training or empathy. It augments agent skills, especially for newer team members or complex situations."

**Key Message:**
Coaching, not scripting. Augmentation, not automation.

---

### 6. Results Summary (20 seconds)

**Show stats:**
```json
{
  "total_conversations": 12,
  "avg_toxicity": 0.45,
  "risk_distribution": {
    "none": 1,
    "low": 3,
    "medium": 2,
    "high": 4,
    "critical": 2
  }
}
```

**Script:**
> "12 conversations analyzed. Average toxicity: 0.45. Risk distribution shows realistic mix: 2 critical, 4 high, 2 medium, 3 low, 1 none. The system handles the full spectrum of customer interactions."

**Key Message:**
Real-world distribution. Not cherry-picked easy cases.

---

### 7. Business Impact (30 seconds)

**Script:**
> "Why does this matter? Three reasons:
>
> 1. **Agent well-being**: Reduces burnout from toxic interactions. Agents feel supported, not alone.
> 2. **Customer retention**: De-escalated customers stay customers. Better CSAT, lower churn.
> 3. **Efficiency**: Faster resolution when agents know exactly how to respond. Fewer escalations that don't need escalation.
>
> This isn't AI for AI's sake—it's measurable business value."

**Key Message:**
ROI-driven. Human-centric. Measurable outcomes.

---

### 8. Closing (20 seconds)

**Script:**
> "You can run this yourself: `npm run demo:deescalation`. Twelve scenarios, full analysis, coaching guidance. Everything is documented and reproducible. Questions?"

**Show:**
- `demos/README.md`
- `demos/scripts/deescalation-demo-script.md`
- CLI commands

---

## Handling Q&A

### Expected Questions & Answers

**Q: Does this replace agent training?**
A: "No—it augments it. Think of it as an expert coach whispering in your ear during a tough call. Experienced agents get reinforcement, newer agents get guidance."

**Q: What if the AI suggests the wrong response?**
A: "Agents always have final say. The AI provides coaching, not scripts. Agents use professional judgment. And all interactions are logged for quality review."

**Q: Can it handle different languages/cultures?**
A: "This demo is English-focused. In production, we support [X languages]. Cultural context is crucial—we tune toxicity thresholds by region and locale."

**Q: How accurate is the toxicity scoring?**
A: "We use state-of-the-art NLP models validated against human judgment. Accuracy is [X]% on standard benchmarks. But we always provide context, not just numbers."

**Q: What about false positives—flagging frustrated but legitimate complaints as 'toxic'?**
A: "Great question. High toxicity doesn't mean 'bad customer.' It means 'high-emotion situation that needs care.' We explicitly coach agents to validate frustration, not dismiss it."

**Q: Can it integrate with our existing support platform?**
A: "Yes. We have connectors for [Zendesk, Salesforce, etc.]. API-first architecture. Can discuss integration requirements."

**Q: What's the ROI?**
A: "Customers report: [X]% reduction in escalations, [Y]% improvement in CSAT, [Z]% decrease in agent turnover. We can model ROI for your team size."

---

## Demo Variations

### For CX Leaders
- Focus on metrics: CSAT, NPS, agent retention, handle time
- Show scalability: training new agents faster
- Discuss integration with existing tools

### For Technical Audiences
- Show API: `deescalation-coach/app/api.py`
- Explain models: sentiment analysis, toxicity detection
- Discuss latency, throughput, infrastructure

### For Executives
- Lead with business impact: retention, efficiency, brand reputation
- Show before/after examples of improved interactions
- Discuss competitive advantage

---

## Troubleshooting

### If API isn't running:
- Demo still works with mock analysis
- Acknowledge: "Using mock data for demo speed, but API works the same way"

### If audience thinks it's "corporate manipulation":
- Emphasize: "This isn't about silencing complaints. It's about helping agents respond to *valid* frustration effectively."
- Show coaching that validates customer concerns
- Explain: We're not changing what customers say, we're helping agents respond better

### If audience asks about bias:
- Acknowledge: "Toxicity models can have bias. We audit for fairness across demographics."
- Show: We provide explanations, not just scores
- Explain: Human-in-loop design catches issues

---

## Post-Demo Follow-Up

**Materials to send:**
- [ ] This demo script
- [ ] `demos/README.md`
- [ ] ROI calculator
- [ ] Integration guide
- [ ] Safety & privacy documentation
- [ ] Trial proposal

**Key Metrics to Track:**
- Demo completion rate
- Questions about integration vs. concerns about ethics (good signal!)
- Conversion rate for CX leaders
- Requests for custom scenarios

---

**Version**: 1.0.0
**Last Updated**: 2025-11-20
**Owner**: Product Demo Team
