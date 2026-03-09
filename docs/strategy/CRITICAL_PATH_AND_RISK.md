# **CRITICAL PATH ANALYSIS: What Actually Kills This**

## The 5 Failure Modes (Ranked by Likelihood)

### 1. **Founder Burnout / Execution Paralysis** (70% probability)

**The problem**: 7 products = 7x cognitive load. You get stuck context-switching, nothing ships on time.

**Early warning signs**:

- Week 3: Still refactoring architecture instead of talking to customers
- Week 6: No paying customers yet, still "perfecting" the product
- Week 9: Hired 2 engineers but they're blocked waiting for your decisions

**Prevention protocol**:

**A. Forced Prioritization (Week 1)**

```
Pick ONE product to ship first. Kill the rest until Month 3.

Decision matrix:
Which product has:
1. Shortest time-to-first-revenue? (days, not months)
2. Lowest complexity? (fewest dependencies)
3. Clearest customer pain? (they're already trying to solve this)

Most likely answer: FactFlow (newsrooms) OR FactGov (government)

Why FactFlow wins:
- You can demo it immediately (just transcription + claim extraction)
- Newsrooms have urgent need (election year 2026)
- Low technical complexity (no deepfake detection, no financial compliance)

Why FactGov wins:
- Cooperative partnerships = instant distribution (500+ agencies)
- Government procurement = multi-year contracts ($500K-5M)
- Builds the moat (controls distribution for all other products)

PICK ONE. Ship it in 4 weeks. Ignore the other 6 until you have 5 paying customers.
```

**B. Weekly Forcing Functions**

```
Every Monday 9am:
- What shipped last week? (code deployed, customer signed, hire made)
- What ships this week? (ONE thing only)
- What gets punted? (everything else)

If you didn't ship last week, you're in trouble.
If you didn't ship for 2 weeks, the company is dying.
```

**C. Delegation Tripwires**

```
Week 4: If you're still writing all the code, hire contractor immediately
Week 8: If you're still doing customer support, hire CS person immediately
Week 12: If you're still managing infra, hire DevOps immediately

Cost of NOT delegating: You become the bottleneck; nothing scales
```

***

### 2. **No One Will Pay** (50% probability)

**The problem**: Great tech, no customers. Everyone says "interesting" but no one signs contracts.

**Early warning signs**:

- Week 4: 20 demos, zero pilots
- Week 8: 3 pilots, but all "we need to wait until Q3" (never happens)
- Week 12: $0 revenue, burning $50K/month on salaries

**Prevention protocol**:

**A. Revenue Validation (Week 2-3)**

```
Before you build ANYTHING beyond MVP, get LOI (Letter of Intent) from 3 customers.

Email template:
---
Subject: Pilot Agreement — FactFlow

Hi [Customer],

Thanks for the demo call. Based on our conversation, here's what I'm proposing:

30-Day Pilot:
- You get: Full FactFlow access (live transcription, claim extraction, verdicts)
- You pay: $500 (refundable if you're not satisfied)
- Timeline: Start [date], end [date]
- Next steps: If satisfied, standard pricing is $2,500/month

If this sounds good, reply "YES" and I'll send Stripe invoice.

Best,
[Your name]
---

If 10 customers say "sounds great!" but won't pay $500 for a pilot:
→ The problem isn't real enough
→ Your solution isn't valuable enough
→ PIVOT or KILL the product
```

**B. Pricing Validation (Week 4)**

```
For every product, validate pricing BEFORE building:

FactFlow: $2,500/month?
→ Test: Email 10 newsrooms, "Would you pay $2,500/month for live fact-checking?"
→ If 5+ say "maybe" or "yes" → BUILD
→ If <3 say "maybe" → LOWER PRICE or KILL

FactLaw: $10K-30K/month?
→ Test: Email 10 law firms, show pricing page
→ If 3+ book demo → BUILD
→ If 0-1 book demo → PRODUCT IS DEAD

FactGov: 12% platform fee?
→ Test: Email 5 cooperatives, pitch partnership
→ If 1+ responds positively → BUILD
→ If all ignore/reject → KILL
```

**C. Payment Collection (Week 5+)**

```
Rule: NEVER do work without payment upfront (for SMB/mid-market)

Bad: "We'll start the pilot, invoice us at the end"
→ 80% never pay

Good: "I'll send Stripe link; once payment clears, I'll provision your account"
→ 100% pay or reveal they weren't serious

For enterprise (>$100K contracts):
- Net-30 is acceptable
- But require PO (purchase order) BEFORE starting work
- If they won't send PO, they're not a real customer
```

***

### 3. **Can't Hire Fast Enough** (40% probability)

**The problem**: You find product-market fit, but can't scale because you're the only engineer.

**Early warning signs**:

- Week 8: 10 paying customers, but you're working 80 hours/week to support them
- Week 12: Customer churn because you're too slow to fix bugs
- Week 16: Can't take on new customers because you can't onboard them

**Prevention protocol**:

**A. Hire Earlier Than Comfortable (Week 2-4)**

```
DON'T wait for:
- "Perfect" candidate
- "Enough" revenue to cover salary
- "Clear" role definition

DO hire when:
- You're working >60 hours/week
- Customers are waiting on you for >48 hours
- You haven't shipped a feature in 2 weeks because you're buried

Better to hire and overpay than to lose customers because you're overwhelmed.
```

**B. Contractor Bridge (Week 1)**

```
While searching for full-time founding engineer:

Hire 2 contractors immediately:
1. Backend contractor ($100-150/hour, 20 hours/week)
   → Builds product-specific API endpoints
   → Takes your architecture, implements features

2. Frontend contractor ($80-120/hour, 20 hours/week)
   → Builds dashboards (FactFlow, FactLaw, FactGov UIs)
   → You give Figma mockups, they build React components

Cost: $7K-10K/week
Benefit: 2-3x your shipping velocity

Where to find:
- Upwork (filter: Top Rated Plus, >95% success rate)
- Toptal (pre-vetted, but 2x more expensive)
- Gun.io (US-based, high quality)
```

**C. Equity Budget (Week 1)**

```
Set aside equity NOW before you need it:

Founding team equity pool: 15-20%
- Founding engineer: 1-2%
- Head of Product: 0.5-1%
- Head of Sales: 0.5-1%
- Engineers 2-5: 0.2-0.5% each
- Sales/ops hires: 0.1-0.3% each

If you wait until Week 12 to think about equity, you'll:
- Offer too little (can't attract talent)
- Offer too much (run out of equity by hire #10)
```

***

### 4. **Technical Debt Spiral** (30% probability)

**The problem**: You ship fast, break things, accumulate tech debt. By Month 6, the codebase is unmaintainable.

**Early warning signs**:

- Week 8: Simple feature takes 3 days because codebase is spaghetti
- Week 12: Production outage every week
- Week 16: New engineer joins, says "this code is a disaster, we need to rewrite"

**Prevention protocol**:

**A. Architecture Guardrails (Week 1)**

```
Non-negotiable rules:

1. Multi-tenancy from Day 1
   - Every table has org_id foreign key
   - Every API request includes tenant context
   - Don't retrofit this later (it's brutal)

2. Shared services from Day 1
   - One verification engine, not 7 copies
   - One auth system, not per-product auth
   - One billing system, not per-product billing

3. Feature flags from Day 1
   - Use LaunchDarkly or similar
   - Every product-specific feature behind flag
   - Allows A/B testing, gradual rollout

4. Monitoring from Day 1
   - Sentry for error tracking
   - Prometheus + Grafana for metrics
   - Stripe for revenue analytics
```

**B. Code Review Process (Week 4)**

```
Once you have 2+ engineers:

All code goes through PR review:
- No direct commits to main
- Require 1 approval before merge
- Enforce with GitHub branch protection

PR template:
---
## What changed?
[One sentence description]

## Why?
[Customer need or bug fix]

## How to test?
[Steps to verify it works]

## Screenshots (if UI changed)
[Attach screenshots]
---

If PRs are taking >24 hours to review, you're blocking too much.
If PRs are taking <1 hour, you're not reviewing carefully enough.
```

**C. Testing Pyramid (Week 6)**

```
Minimum viable testing:

Unit tests: 50% coverage
- Test core verification logic
- Test billing calculations
- Test auth/permissions

Integration tests: 20% coverage
- Test API endpoints end-to-end
- Test database migrations
- Test Stripe webhooks

E2E tests: 10% coverage
- Test critical user flows (signup → verify claim → see result)
- Run on every deploy

If you're <30% total test coverage by Month 3, you're accumulating debt.
```

***

### 5. **Regulatory/Legal Shutdown** (10% probability, but catastrophic)

**The problem**: Government says "you need license to operate" or customer sues you for false verdict.

**Early warning signs**:

- Week 8: Customer asks "are you SOC2 certified?" (you're not)
- Week 12: Law firm asks "what happens if your AI is wrong and we lose case?" (you have no answer)
- Week 16: Government agency says "we can only buy from FedRAMP vendors" (you're not)

**Prevention protocol**:

**A. Legal Foundation (Week 1)**

```
Day 1 checklist:
□ Form Delaware C-Corp (not LLC)
□ Terms of Service drafted (use Ironclad or Avodocs templates)
□ Privacy Policy (use iubenda template)
□ Customer contract template (MSA + Order Form)

Cost: $2K-5K (lawyer fees)

Critical TOS clauses:
1. Limitation of liability
   "Summit is not liable for damages exceeding amount paid in last 12 months"

2. No warranty on AI outputs
   "Verification results provided 'as is' without guarantee of accuracy"

3. Indemnification
   "Customer indemnifies Summit for misuse of platform"

This protects you from "your AI was wrong, you owe us $10M" lawsuits.
```

**B. Compliance Roadmap (Month 2-6)**

```
Tier 1: Required for any B2B SaaS (Month 2-3)
□ SOC2 Type I ($15K-30K, 3-6 months)
□ GDPR compliance (if EU customers)
□ CCPA compliance (if CA customers)

Tier 2: Required for financial/legal (Month 4-6)
□ SOC2 Type II ($30K-50K, 12 months)
□ ISO 27001 ($50K-100K, 12 months)
□ Penetration testing ($10K-20K)

Tier 3: Required for government (Month 9-12)
□ FedRAMP Low/Moderate ($250K-500K, 18-24 months)
□ StateRAMP (state government version)

Don't block on these. Sell first, then get compliant.
But START the process early (SOC2 takes 6+ months).
```

**C. Insurance (Week 4)**

```
Day 1 insurance:
□ General liability: $1M coverage ($500-1K/year)
□ E&O (Errors & Omissions): $2M coverage ($5K-10K/year)
□ Cyber liability: $1M coverage ($2K-5K/year)

This covers:
- Customer sues because your verification was wrong
- Data breach / security incident
- Employee injury (if you have office)

Cost: $10K-20K/year
Benefit: Sleep at night
```

***

## **The Forcing Function Calendar**

```
Week 1:  ☐ Pick ONE product to ship first
Week 2:  ☐ Get 3 LOIs (Letters of Intent) from customers
Week 3:  ☐ Collect first $1,500 in revenue (3 × $500 pilots)
Week 4:  ☐ Hire 2 contractors OR make offer to founding engineer
Week 5:  ☐ Ship MVP to first paying customer
Week 6:  ☐ Convert 1 pilot → full contract ($2,500+/month)
Week 8:  ☐ 5 paying customers OR pivot/kill product
Week 10: ☐ $15K MRR OR declare failure mode
Week 12: ☐ Start SOC2 compliance process
Week 16: ☐ $50K MRR OR consider shutting down
```

**If you miss 3 consecutive weeks, the company is in crisis mode.**

***

## **The "Kill Switch" Decision Tree**

```
Month 3 checkpoint:

IF revenue < $10K MRR:
  ├─ Are there 20+ qualified leads in pipeline?
  │  ├─ YES → Keep going (sales cycle issue)
  │  └─ NO → PIVOT or SHUT DOWN
  │
  └─ Did you talk to 50+ potential customers?
     ├─ YES → Product-market fit doesn't exist, PIVOT
     └─ NO → You haven't tried hard enough, GO SELL

Month 6 checkpoint:

IF revenue < $50K MRR:
  ├─ Did you hire 3+ people?
  │  ├─ YES → Execution problem (team wrong fit)
  │  └─ NO → You tried to do it alone (hire NOW)
  │
  └─ Are customers renewing?
     ├─ <60% renewal → Product doesn't work, PIVOT
     └─ >80% renewal → Just need more top-of-funnel

Month 9 checkpoint:

IF revenue < $100K MRR:
  ├─ Burn rate > revenue?
  │  ├─ YES → Runway left?
  │  │  ├─ <6 months → Raise bridge OR shut down
  │  │  └─ >6 months → Push for profitability
  │  └─ NO → You're default alive, keep going

Month 12 checkpoint:

IF revenue < $200K MRR:
  └─ Decision: Lifestyle business OR shut down
     - Lifestyle: Fire everyone, run solo/small team, $500K-1M/year
     - Shut down: Return remaining capital to investors (if any)
```

***

## **What Success Looks Like (Realistic Scenario)**

```
Month 1:  $0 → $5K MRR (3 pilots convert)
Month 2:  $5K → $15K MRR (add 5 more customers)
Month 3:  $15K → $30K MRR (churn 2, add 8)
Month 6:  $30K → $75K MRR (start scaling product #2)
Month 9:  $75K → $150K MRR (hire AEs, scale sales)
Month 12: $150K → $250K MRR (ready for Series A)

Year 1 ARR: $3M
Burn: $150K/month (salaries, infra, marketing)
Net: -$1.5M (need seed round or bootstrap)

Year 2 ARR: $10M
Burn: $300K/month
Net: -$500K (approaching profitability)

Year 3 ARR: $30M
Burn: $500K/month
Net: +$1.5M (profitable)
```

**This is NOT the "$50M in 12 months" scenario from earlier reports.**
**This IS the "actually survivable" scenario.**

***

## **Final Reality Check**

The original plan had 7 products generating $30-50M ARR in Year 1.

**That's fantasy.**

**Here's reality**:

- You'll launch 1-2 products in Year 1 (not 7)
- You'll hit $2-5M ARR (not $30M)
- You'll hire 10-15 people (not 35)
- You'll raise $2-5M seed (not build this bootstrapped)

**But that's still a huge success.**

$3M ARR, 15-person team, product-market fit = Series A fundraise at $30-50M valuation.

**The key**: Ship ONE product. Get 10 paying customers. Then scale.

Don't try to build 7 products in parallel. That's how you build zero products.

***

## **Your Actual Week 1 (Revised)**

Forget the 7 products. Pick one:

**Option A: FactFlow (Newsroom)**

- Easiest to demo
- Clear use case (election year)
- Ship in 4 weeks

**Option B: FactGov (Government)**

- Hardest to build
- But builds the moat
- 6-12 month sales cycle

Which one gets you to $10K MRR fastest? **Build that.**

Then come back in Month 6 and build product #2.

That's how you actually execute. 🎯
