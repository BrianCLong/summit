# ROI Calculator Guide
## Summit / IntelGraph / Maestro Platform

**Purpose**: Quantify business value for prospects across all ICP segments
**Usage**: Customize calculator for each segment, use in discovery and proposal stages
**Format**: Excel/Google Sheets with customer-editable assumptions

---

## Table of Contents

1. [Government/Defense/Intelligence ROI Model](#governmentdefenseintelligence-roi-model)
2. [Prime Contractors & SIs ROI Model](#prime-contractors--sis-roi-model)
3. [Regulated Enterprise ROI Model](#regulated-enterprise-roi-model)
4. [NGOs & Think Tanks ROI Model](#ngos--think-tanks-roi-model)
5. [TCO Comparison Model (vs. Palantir)](#tco-comparison-model-vs-palantir)
6. [Calculator Best Practices](#calculator-best-practices)

---

## Government/Defense/Intelligence ROI Model

### Value Drivers

**Primary Benefits**:
1. **Analyst Productivity** (time savings → FTE reduction or capacity increase)
2. **Faster Threat Detection** (mission outcomes → risk mitigation value)
3. **Compliance Cost Avoidance** (zero audit findings → no remediation costs)
4. **Deployment Speed** (operational 6-12 months sooner → mission value)

### Calculator Inputs (Customer-Editable)

| Input | Typical Range | Example Value |
|-------|---------------|---------------|
| **Number of Intelligence Analysts** | 25-500 | 100 |
| **Avg Analyst Salary (loaded)** | $120K-$180K | $150K |
| **Hours per Investigation (current)** | 40-160 | 80 hours |
| **Investigations per Analyst per Year** | 20-50 | 30 |
| **% Time Spent on Manual Tasks** | 40-70% | 60% |
| **Cost of Compliance Violation** | $500K-$5M | $2M |
| **Violations per Year (current)** | 0-5 | 2 |
| **Value of Early Threat Detection** | $1M-$100M | $10M (per incident) |

### ROI Calculation

**Analyst Productivity Savings**:
```
Current Hours per Investigation: 80 hours
Summit Reduces Investigation Time by: 60%
New Hours per Investigation: 32 hours
Hours Saved per Investigation: 48 hours

Annual Investigations: 100 analysts × 30 cases = 3,000 cases
Total Hours Saved: 3,000 × 48 = 144,000 hours

FTE Equivalent: 144,000 / 2,080 (work hours/year) = 69 FTEs
Annual Savings: 69 × $150K = $10.4M

OR (Capacity Increase):
Additional Cases Handled: 3,000 × (60% / 40%) = 4,500 cases (+50% capacity)
```

**Faster Threat Detection**:
```
Current Time to Detect Threat: 14 days
Summit Reduces Detection Time by: 60%
New Time to Detect: 5.6 days (9 days faster)

Threats Detected Early: 12 per year (conservative)
Value per Early Detection: $10M (prevented attack, saved lives, etc.)
Annual Value: 12 × $10M = $120M (risk mitigation)

Note: This is hard to quantify, but agencies often cite this as primary value.
```

**Compliance Cost Avoidance**:
```
Current Compliance Violations per Year: 2
Cost per Violation (remediation, audit, fines): $2M
Annual Compliance Cost: 2 × $2M = $4M

Summit Violations (immutable audit trail): 0
Annual Savings: $4M
```

**Deployment Speed (Opportunity Cost)**:
```
Palantir Deployment: 12 months
Summit Deployment: 1 month
Time Savings: 11 months

Mission Value per Month: $5M (customer-defined)
Opportunity Cost Avoided: 11 × $5M = $55M

(This is the value of being operational 11 months sooner)
```

**Total Annual ROI**:
```
Analyst Productivity: $10.4M
Threat Detection: $120M (risk mitigation, hard to quantify)
Compliance Savings: $4M
Deployment Speed: $55M (one-time, Year 1 only)

Total Quantifiable Value (Year 1): $69.4M
Total Ongoing Value (Year 2+): $14.4M/year

Summit Cost:
  Year 1: $1M (50 analysts @ $20K/seat)
  Ongoing: $1M/year

ROI (Year 1): ($69.4M - $1M) / $1M = 6,840%
ROI (Year 2+): ($14.4M - $1M) / $1M = 1,340%
Payback Period: < 1 month
```

### Conservative vs. Aggressive Scenarios

**Conservative** (use for risk-averse agencies):
- 30% productivity improvement (vs. 60%)
- 2 early threat detections per year (vs. 12)
- $1M value per threat (vs. $10M)
- **Result**: $8M annual value, 700% ROI

**Aggressive** (use for high-urgency missions):
- 70% productivity improvement
- 20 early threat detections
- $50M value per threat (WMD, major attack prevented)
- **Result**: $1B+ annual value (essentially priceless for IC)

**Recommendation**: Start with conservative model, let customer adjust assumptions.

---

## Prime Contractors & SIs ROI Model

### Value Drivers

**Primary Benefits**:
1. **Win Rate Improvement** (more contracts won → revenue growth)
2. **Build vs. Buy Savings** (avoid 18-month dev cycle → cost avoidance)
3. **Faster Time-to-Demo** (win competitive evals → higher close rate)
4. **Margin Improvement** (OEM vs. custom build → higher profitability)

### Calculator Inputs

| Input | Typical Range | Example Value |
|-------|---------------|---------------|
| **Active Pursuits per Year** | 10-50 | 20 |
| **Avg Contract Value** | $5M-$50M | $25M |
| **Current Win Rate** | 20-40% | 30% |
| **Custom Build Cost** | $5M-$20M | $10M |
| **Custom Build Timeline** | 12-24 months | 18 months |
| **Professional Services Rate** | $200-$400/hr | $250/hr |
| **Margin on License Resale** | 20-40% | 30% |

### ROI Calculation

**Win Rate Improvement**:
```
Current Pursuits per Year: 20
Current Win Rate: 30%
Current Wins: 6 contracts

With Summit (Differentiated Tech):
New Win Rate: 40% (10 percentage point increase)
New Wins: 8 contracts

Incremental Wins: 2 additional contracts
Avg Contract Value: $25M
Incremental Revenue: 2 × $25M = $50M

Margin on Incremental Revenue: 15% (typical govt contractor)
Incremental Profit: $50M × 15% = $7.5M
```

**Build vs. Buy Savings**:
```
Custom Build Cost:
  • Dev Team: 10 engineers × $200K/year × 1.5 years = $3M
  • Overhead: $2M (PM, infrastructure, etc.)
  • Opportunity Cost: $5M (team could work on billable projects)
  Total Custom Build Cost: $10M

Summit OEM Cost:
  • Year 1 License: $500K
  • Integration Services: $200K
  Total Summit Cost: $700K

Cost Avoidance: $10M - $700K = $9.3M
```

**Faster Time-to-Demo**:
```
Competitive Eval Timeline:
  • Customer requests demo: Week 2 of RFP
  • Custom build can't demo: "Vaporware" slides only
  • Summit demo ready: 5 business days

Likelihood of Winning with Live Demo: 60%
Likelihood of Winning with Slides: 20%
Improvement: 40 percentage points

Pursuits with Demo Requirement: 10 per year
Additional Wins: 10 × 40% = 4 wins
Avg Contract Value: $25M
Incremental Revenue: 4 × $25M = $100M
Incremental Profit: $100M × 15% = $15M
```

**Margin Improvement**:
```
OEM Resale Model:
  • Customer pays: $1M (50-analyst license)
  • Summit wholesale cost: $700K
  • Gross margin: $300K (30%)

Custom Build Model:
  • Customer pays: $1M
  • Internal cost: $900K (dev, maintenance)
  • Gross margin: $100K (10%)

Margin Improvement: $300K - $100K = $200K per deal

Deals per Year with Summit: 6
Total Margin Improvement: 6 × $200K = $1.2M
```

**Total Annual ROI**:
```
Win Rate Improvement: $7.5M
Build vs. Buy Savings: $9.3M (one-time, Year 1)
Faster Time-to-Demo: $15M
Margin Improvement: $1.2M

Total Value (Year 1): $33M
Total Ongoing Value (Year 2+): $23.7M/year

Summit OEM Cost:
  Year 1: $500K (base partnership fee)
  Ongoing: $200K/year (partnership maintenance)

ROI (Year 1): ($33M - $500K) / $500K = 6,400%
ROI (Year 2+): ($23.7M - $200K) / $200K = 11,750%
Payback Period: < 1 month
```

---

## Regulated Enterprise ROI Model

### Value Drivers (Financial Services Example)

**Primary Benefits**:
1. **Faster Case Resolution** (reduce investigator workload → FTE savings)
2. **False Positive Reduction** (free up capacity → handle more cases)
3. **Fraud Loss Prevention** (detect fraud faster → reduce losses)
4. **Regulatory Fine Avoidance** (zero compliance violations → no penalties)

### Calculator Inputs

| Input | Typical Range | Example Value |
|-------|---------------|---------------|
| **Number of AML/Fraud Investigators** | 50-500 | 200 |
| **Avg Investigator Salary (loaded)** | $80K-$120K | $100K |
| **Cases per Investigator per Year** | 100-300 | 200 |
| **Avg Case Resolution Time (hours)** | 8-40 | 20 hours |
| **False Positive Rate** | 40-80% | 60% |
| **Annual Fraud Losses** | $10M-$500M | $100M |
| **Recent Regulatory Fines** | $0-$1B | $50M |
| **Annual SARs Filed** | 1,000-50,000 | 10,000 |

### ROI Calculation

**Faster Case Resolution**:
```
Current Time per Case: 20 hours
Summit Reduces Case Time by: 70%
New Time per Case: 6 hours
Time Saved per Case: 14 hours

Annual Cases: 200 investigators × 200 cases = 40,000 cases
Total Hours Saved: 40,000 × 14 = 560,000 hours

FTE Equivalent: 560,000 / 2,080 = 269 FTEs
Annual Savings: 269 × $100K = $26.9M

OR (Capacity Increase):
Additional Cases Handled: 40,000 × (70% / 30%) = 93,333 cases (+133% capacity)
```

**False Positive Reduction**:
```
Current Cases per Year: 40,000
Current False Positive Rate: 60%
Wasted Effort on False Positives: 40,000 × 60% = 24,000 cases

Summit False Positive Rate: 30% (50% reduction)
New Wasted Effort: 40,000 × 30% = 12,000 cases
Cases Freed Up: 12,000 cases

Hours Saved: 12,000 × 20 hours = 240,000 hours
FTE Equivalent: 240,000 / 2,080 = 115 FTEs
Annual Savings: 115 × $100K = $11.5M
```

**Fraud Loss Prevention**:
```
Current Fraud Losses: $100M per year
Current Detection Rate: 70% (within SLA)

Summit Improves Detection Rate to: 85% (+15 percentage points)
Additional Fraud Caught: $100M / 70% × 15% = $21.4M

Fraud Recovery Rate: 40% (typical for banks)
Recovered Losses: $21.4M × 40% = $8.6M

Annual Fraud Loss Reduction: $8.6M
```

**Regulatory Fine Avoidance**:
```
Recent FinCEN Fine: $50M (2023)
Consent Order Remediation Cost: $100M (over 3 years)
Annual Compliance Risk: $50M (amortized)

Summit Compliance Features:
  • Immutable audit trail (zero findings in exams)
  • Automated SAR evidence gathering
  • Real-time suspicious activity alerts

Probability of Fine without Summit: 20% (based on industry data)
Expected Fine Cost: $50M × 20% = $10M

Probability of Fine with Summit: 2%
Expected Fine Cost: $50M × 2% = $1M

Annual Fine Avoidance: $10M - $1M = $9M
```

**Total Annual ROI**:
```
Case Resolution Savings: $26.9M
False Positive Reduction: $11.5M
Fraud Loss Prevention: $8.6M
Regulatory Fine Avoidance: $9M

Total Annual Value: $56M

Summit Cost:
  Year 1: $2M (200 investigators @ $10K/seat)
  Ongoing: $2M/year

ROI: ($56M - $2M) / $2M = 2,700%
Payback Period: 2 weeks
```

---

## NGOs & Think Tanks ROI Model

### Value Drivers

**Primary Benefits**:
1. **Research Productivity** (faster investigations → more publications)
2. **Grant Funding Success** (better tools → higher grant win rate)
3. **Collaboration Efficiency** (multi-org projects → less coordination overhead)
4. **Impact Amplification** (better research → policy change, enforcement actions)

### Calculator Inputs

| Input | Typical Range | Example Value |
|-------|---------------|---------------|
| **Number of Researchers/Journalists** | 10-100 | 30 |
| **Avg Researcher Salary (loaded)** | $60K-$100K | $80K |
| **Hours per Investigation** | 200-2,000 | 500 hours |
| **Investigations per Year** | 5-20 | 10 |
| **% Time on Manual Data Work** | 50-80% | 70% |
| **Annual Budget** | $1M-$50M | $10M |
| **Grant Win Rate** | 20-50% | 30% |
| **Avg Grant Size** | $100K-$5M | $500K |

### ROI Calculation

**Research Productivity**:
```
Current Hours per Investigation: 500 hours
Summit Reduces Investigation Time by: 60% (automation)
New Hours per Investigation: 200 hours
Hours Saved per Investigation: 300 hours

Annual Investigations: 10
Total Hours Saved: 10 × 300 = 3,000 hours

FTE Equivalent: 3,000 / 2,080 = 1.4 FTEs
Annual Savings: 1.4 × $80K = $112K

OR (Capacity Increase):
Additional Investigations per Year: 10 × (60% / 40%) = 15 investigations (+50%)
Additional Publications: 15 reports/articles
Media Impact Value: 15 × $50K = $750K (earned media, citations)
```

**Grant Funding Success**:
```
Grant Applications per Year: 20
Current Win Rate: 30%
Current Wins: 6 grants
Avg Grant Size: $500K
Current Grant Revenue: $3M

With Summit (Demonstrated Tech Capacity):
New Win Rate: 40% (+10 percentage points)
New Wins: 8 grants
New Grant Revenue: $4M

Incremental Revenue: $1M per year
```

**Collaboration Efficiency**:
```
Multi-Org Investigations per Year: 5
Partner Organizations per Investigation: 8
Coordination Overhead (current): 40% of project time

Summit Reduces Coordination Overhead to: 10% (shared platform, real-time collab)
Time Saved: 30 percentage points

Hours per Multi-Org Investigation: 1,000 hours
Hours Saved: 1,000 × 30% = 300 hours
Total Annual Savings: 5 × 300 = 1,500 hours

FTE Equivalent: 1,500 / 2,080 = 0.7 FTEs
Annual Savings: 0.7 × $80K = $56K
```

**Impact Amplification**:
```
Current Investigations Leading to Policy Change: 2 per year
Value per Policy Win: $10M (societal impact, difficult to quantify)
Current Impact: $20M

With Summit (Faster, More Rigorous Research):
Investigations Leading to Policy Change: 4 per year
Impact: $40M

Incremental Impact: $20M (hard to quantify, but real)
```

**Total Annual ROI**:
```
Research Productivity: $112K (or $750K if measuring media value)
Grant Funding Success: $1M
Collaboration Efficiency: $56K
Impact Amplification: $20M (societal value, not financial)

Total Quantifiable Value: $1.17M (conservative, financial only)
Total Impact Value: $21.17M (including societal outcomes)

Summit Cost (Nonprofit Pricing):
  Year 1: $50K (30 researchers, 80% discount)
  Ongoing: $50K/year

ROI (Financial Only): ($1.17M - $50K) / $50K = 2,240%
ROI (Including Impact): ($21.17M - $50K) / $50K = 42,240%
Payback Period: 3 weeks
```

**Narrative for NGOs**:
> "For nonprofit organizations, ROI isn't just financial—it's mission impact. Summit
> helps you do more investigations, win more grants, and drive more policy change.
>
> For $50K/year (nonprofit pricing), you get enterprise-grade tools that typically
> cost $500K+. That's a 10x leverage on your budget, enabling 50% more research output
> and doubling your policy wins.
>
> The question isn't 'Can we afford it?'—it's 'Can we afford NOT to invest in the
> tools that maximize our mission impact?'"

---

## TCO Comparison Model (vs. Palantir)

### 5-Year Total Cost of Ownership

**Assumptions** (50-analyst deployment):

| Cost Component | Summit | Palantir |
|----------------|--------|----------|
| **Year 1** | | |
| License Fees | $500K | $5M |
| Professional Services (deployment) | $50K (200 hrs @ $250) | $2.5M (10,000 hrs @ $250) |
| Training | $15K (3-day workshop) | $100K (3-week program) |
| Infrastructure (cloud/on-prem) | $50K | $200K |
| **Year 1 Total** | **$615K** | **$7.8M** |
| | | |
| **Year 2-5 (Annual)** | | |
| License Fees | $500K | $5M + 10% escalator |
| Maintenance & Support | Included | $500K/year |
| Professional Services (ongoing) | $25K (100 hrs/year) | $500K (2,000 hrs/year) |
| Infrastructure | $50K | $200K |
| **Annual Ongoing (Yr 2)** | **$575K** | **$6.7M** |
| | | |
| **5-Year TCO** | **$2.9M** | **$35.8M** |

**Savings**: $35.8M - $2.9M = **$32.9M (92% cost reduction)**

**Key Differentiators**:
- Summit: **Minimal services required** (golden path deployment)
- Palantir: **Services-heavy** (10,000 hrs deployment, 2,000 hrs/year ongoing)
- Summit: **Transparent pricing** (no hidden costs)
- Palantir: **Opaque pricing** (time-and-materials, cost overruns common)

---

## Calculator Best Practices

### Discovery Stage (Qualify Interest)

**Approach**:
1. **Ask for inputs during discovery**: "How many investigators do you have? What's the average case resolution time?"
2. **Build model live** (screen share in Zoom): "Let me plug these numbers into our ROI calculator..."
3. **Show preliminary results**: "Based on your numbers, you could save $X per year. Does that seem realistic?"
4. **Iterate together**: "What assumptions would you change? Let's adjust and see how it impacts ROI."

**Goals**:
- Quantify pain (make it real with numbers)
- Build credibility (transparent, customer-driven model)
- Create urgency (big savings = strong business case)

---

### Proposal Stage (Justify Investment)

**Approach**:
1. **Include calculator as appendix** in proposal (Excel file or PDF screenshot)
2. **Provide three scenarios**: Conservative, Expected, Aggressive
3. **Highlight payback period**: "Investment pays for itself in X weeks/months"
4. **Compare to alternatives**: Summit vs. Status Quo vs. Palantir (TCO model)

**Goals**:
- Provide ammunition for internal business case
- De-risk decision (show strong financial justification)
- Contrast with competition (highlight cost savings)

---

### Objection Handling (Price Concerns)

**Objection**: "Your price is too high."

**Response with Calculator**:
> "I understand the budget concern. Let's look at the ROI together.
>
> [Pull up calculator]
>
> Based on your 100 investigators and 20-hour average case time:
>   • Summit reduces case time by 70% (to 6 hours)
>   • That's 560,000 hours saved per year
>   • Or 269 FTE equivalents
>   • At $100K per investigator, that's $26.9M in annual value
>
> Summit costs $2M per year.
>
> So the question isn't 'Is $2M too expensive?'—it's 'Is a 1,245% ROI worth it?'
>
> What part of this math doesn't work for you?"

---

### Customization Tips

**For Conservative Buyers**:
- Use conservative assumptions (30% improvement, not 60%)
- Focus on hard costs (FTE savings, compliance), not soft benefits (mission impact)
- Show payback period < 12 months

**For Aggressive Buyers**:
- Use aspirational assumptions (70% improvement, aligned with best-in-class)
- Include soft benefits (mission outcomes, risk mitigation, strategic value)
- Show 5-year NPV and IRR (for CFO-led decisions)

**For Technical Buyers**:
- Focus on productivity metrics (hours saved, cases handled)
- Include analyst satisfaction (NPS, retention)
- De-emphasize financial ROI (they don't control budget)

**For Executive Buyers**:
- Lead with total value ($56M) and ROI (2,700%)
- Include strategic benefits (competitive advantage, innovation)
- Compare to alternatives (TCO vs. Palantir, build vs. buy)

---

## Calculator Templates (File Locations)

**To Be Created**:
- [ ] `Gov-Defense-Intel-ROI-Calculator.xlsx`
- [ ] `Primes-SIs-Win-Rate-ROI-Calculator.xlsx`
- [ ] `Financial-Services-AML-ROI-Calculator.xlsx`
- [ ] `NGO-Research-Productivity-ROI-Calculator.xlsx`
- [ ] `TCO-Comparison-Summit-vs-Palantir.xlsx`

**Owner**: Sales Operations (to build Excel templates based on this guide)

---

**Document Owner**: Sales Enablement
**Last Updated**: 2025-11-22
**Feedback**: roi-calculators@summit.ai
