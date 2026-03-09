# Summit ROI/TCO Calculator Model

**Purpose:** Framework for calculating return on investment and total cost of ownership for Summit deployments. Use to build business cases and justify pilot/production investments.

_Version: 2025-11-27_

---

## How to Use This Model

1. **Gather baseline metrics** from customer during discovery
2. **Input assumptions** into the calculator framework below
3. **Calculate savings** across each value driver
4. **Build summary** for executive presentation
5. **Validate assumptions** with customer stakeholders

---

## 1. Input Parameters

### 1.1 Organization Profile

| Parameter | Value | Notes |
|-----------|-------|-------|
| Number of analysts | `{{N}}` | Named users who will use Summit |
| Analyst fully-loaded cost (annual) | `${{X}}` | Salary + benefits + overhead (typically $120-200k) |
| Number of cases/investigations per year | `{{N}}` | Total volume across team |
| Average case complexity | `{{Low/Med/High}}` | Affects time per case |
| Data sources currently used | `{{N}}` | Tools/feeds analysts access |
| Compliance/audit hours per year | `{{N}}` | Time spent on documentation/audit |

### 1.2 Current State Pain Points

| Pain Point | Current Impact | Measurement |
|------------|----------------|-------------|
| Time spent searching/correlating data | `{{X}}` hours/analyst/week | Self-reported or time study |
| Time spent context-switching between tools | `{{X}}` hours/analyst/week | Self-reported |
| Time spent on manual documentation | `{{X}}` hours/analyst/week | Self-reported |
| Cases delayed due to data gaps | `{{X}}%` of cases | Historical data |
| Audit findings related to provenance | `{{N}}` per year | Audit reports |
| Rework due to untraced conclusions | `{{X}}` hours/analyst/month | Self-reported |

### 1.3 Summit Deployment Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Pilot duration | `{{N}}` weeks | |
| Pilot cost | `${{X}}` | |
| Production licensing (annual) | `${{X}}` | Per-user or per-environment |
| Implementation/integration cost | `${{X}}` | One-time |
| Training cost | `${{X}}` | Included or separate |
| Annual maintenance/support | `${{X}}` | Typically 15-20% of license |
| Infrastructure cost (if on-prem) | `${{X}}` | Customer-provided or estimated |

---

## 2. Value Drivers & Calculations

### 2.1 Analyst Productivity Gains

**Driver:** Reduced time searching, correlating, and context-switching

**Calculation:**

```
Current weekly hours on inefficient tasks = {{A}} hours/analyst/week
Expected reduction with Summit = {{B}}% (typically 30-50%)
Hours saved per analyst per week = A × B

Annual hours saved per analyst = Hours saved × 48 weeks
Annual value per analyst = Annual hours saved × (Hourly cost)
Total annual value = Annual value per analyst × Number of analysts

Hourly cost = Annual fully-loaded cost ÷ 2,000 hours
```

**Example:**

| Variable | Value | Calculation |
|----------|-------|-------------|
| Hours on inefficient tasks | 12 hrs/week | Input |
| Reduction with Summit | 40% | Conservative estimate |
| Hours saved per week | 4.8 hrs | 12 × 0.40 |
| Annual hours saved | 230 hrs | 4.8 × 48 |
| Hourly cost | $80 | $160k ÷ 2,000 |
| Annual value per analyst | $18,400 | 230 × $80 |
| Total (10 analysts) | **$184,000** | $18,400 × 10 |

---

### 2.2 Increased Case Throughput

**Driver:** Analysts handle more cases without adding headcount

**Calculation:**

```
Current cases per analyst per year = {{A}}
Expected throughput increase = {{B}}% (typically 20-40%)
Additional cases per analyst = A × B
Value per case = {{C}} (depends on mission; may be revenue, cost avoidance, or strategic)
Total annual value = Additional cases × Number of analysts × Value per case
```

**Example:**

| Variable | Value | Calculation |
|----------|-------|-------------|
| Current cases/analyst/year | 50 | Input |
| Throughput increase | 30% | Conservative estimate |
| Additional cases/analyst | 15 | 50 × 0.30 |
| Value per case | $5,000 | Depends on context |
| Total (10 analysts) | **$750,000** | 15 × 10 × $5,000 |

---

### 2.3 Reduced Audit/Compliance Burden

**Driver:** Provenance and audit trails built into workflow

**Calculation:**

```
Current compliance hours per analyst per year = {{A}}
Expected reduction = {{B}}% (typically 40-60%)
Hours saved per analyst = A × B
Annual value per analyst = Hours saved × Hourly cost
Total annual value = Annual value per analyst × Number of analysts

Plus: Avoided audit finding remediation
Current annual remediation cost = {{C}}
Expected reduction = {{D}}%
Remediation savings = C × D
```

**Example:**

| Variable | Value | Calculation |
|----------|-------|-------------|
| Compliance hours/analyst/year | 100 | Input |
| Reduction with Summit | 50% | Conservative |
| Hours saved/analyst | 50 | 100 × 0.50 |
| Value per analyst | $4,000 | 50 × $80 |
| Total (10 analysts) | **$40,000** | $4,000 × 10 |
| Current remediation cost | $50,000 | Input |
| Remediation reduction | 60% | |
| Remediation savings | **$30,000** | $50,000 × 0.60 |
| **Compliance Total** | **$70,000** | |

---

### 2.4 Reduced Tool/License Consolidation

**Driver:** Retire or reduce spend on redundant tools

**Calculation:**

```
Current annual spend on tools Summit can replace/reduce = {{A}}
Tools fully retired = {{B}}% of spend
Tools reduced (fewer seats) = {{C}}% of spend
Total savings = A × (B + C)
```

**Example:**

| Variable | Value | Calculation |
|----------|-------|-------------|
| Current tool spend | $200,000 | Input |
| Fully retired | 30% | |
| Reduced seats | 20% | |
| **Tool savings** | **$100,000** | $200k × 0.50 |

---

### 2.5 Risk Reduction / Avoided Costs

**Driver:** Reduce risk of missed threats, compliance failures, reputational damage

**Calculation:**

```
Probability of significant incident per year = {{A}}%
Average cost per incident = {{B}}
Expected annual cost = A × B
Risk reduction with Summit = {{C}}%
Avoided cost = Expected annual cost × C
```

**Example:**

| Variable | Value | Calculation |
|----------|-------|-------------|
| Incident probability | 10% | Historical |
| Cost per incident | $500,000 | Historical or industry benchmark |
| Expected annual cost | $50,000 | 0.10 × $500k |
| Risk reduction | 50% | Conservative |
| **Avoided cost** | **$25,000** | $50k × 0.50 |

---

### 2.6 Headcount Avoidance

**Driver:** Handle growth without proportional analyst hiring

**Calculation:**

```
Projected case volume growth = {{A}}% per year
Without Summit: New analysts needed = Current analysts × A
With Summit: New analysts needed = Current analysts × A × (1 - Throughput increase)
Avoided hires = Without Summit hires - With Summit hires
Avoided cost = Avoided hires × Fully-loaded analyst cost
```

**Example:**

| Variable | Value | Calculation |
|----------|-------|-------------|
| Current analysts | 10 | |
| Volume growth | 20% | |
| Without Summit: New hires | 2 | 10 × 0.20 |
| Throughput increase | 30% | |
| With Summit: New hires | 1.4 | 2 × 0.70 |
| Avoided hires | 0.6 | 2 - 1.4 |
| **Avoided cost** | **$96,000** | 0.6 × $160k |

---

## 3. Total Cost of Ownership (3-Year)

### 3.1 Summit Costs

| Cost Category | Year 1 | Year 2 | Year 3 | 3-Year Total |
|---------------|--------|--------|--------|--------------|
| Pilot | ${{X}} | - | - | ${{X}} |
| Production License | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| Implementation | ${{X}} | - | - | ${{X}} |
| Training | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| Maintenance/Support | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| Infrastructure (if on-prem) | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| **Total Summit Cost** | **${{X}}** | **${{X}}** | **${{X}}** | **${{X}}** |

### 3.2 Current State Costs (Comparison)

| Cost Category | Year 1 | Year 2 | Year 3 | 3-Year Total |
|---------------|--------|--------|--------|--------------|
| Existing tool licenses | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| Analyst inefficiency (opportunity cost) | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| Compliance overhead | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| Expected incident costs | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| New hire costs (growth) | ${{X}} | ${{X}} | ${{X}} | ${{X}} |
| **Total Current State Cost** | **${{X}}** | **${{X}}** | **${{X}}** | **${{X}}** |

---

## 4. ROI Summary

### 4.1 Annual Value Summary

| Value Driver | Annual Value |
|--------------|-------------|
| Analyst Productivity Gains | ${{X}} |
| Increased Case Throughput | ${{X}} |
| Reduced Compliance Burden | ${{X}} |
| Tool Consolidation Savings | ${{X}} |
| Risk Reduction / Avoided Costs | ${{X}} |
| Headcount Avoidance | ${{X}} |
| **Total Annual Value** | **${{X}}** |

### 4.2 ROI Calculation

```
3-Year Total Value = Annual Value × 3 (or sum if growing)
3-Year Total Cost = Summit TCO
3-Year Net Benefit = Total Value - Total Cost
ROI = (Net Benefit ÷ Total Cost) × 100

Payback Period = Total Year 1 Cost ÷ (Annual Value ÷ 12)
```

**Example Summary:**

| Metric | Value |
|--------|-------|
| 3-Year Total Value | $3,375,000 |
| 3-Year Summit Cost | $600,000 |
| 3-Year Net Benefit | $2,775,000 |
| **ROI** | **462%** |
| **Payback Period** | **2.8 months** |

---

## 5. Sensitivity Analysis

Show how ROI changes with different assumptions:

| Scenario | Productivity Gain | Throughput Increase | ROI |
|----------|-------------------|---------------------|-----|
| Conservative | 25% | 15% | {{X}}% |
| Base Case | 40% | 30% | {{X}}% |
| Optimistic | 50% | 40% | {{X}}% |

---

## 6. Executive Summary Template

Use this format for business case presentations:

---

### Summit Business Case Summary

**For:** {{Customer Name}}
**Date:** {{Date}}

**Current State:**
- {{N}} analysts spending {{X}} hours/week on inefficient search and correlation
- {{N}} cases per year; growth of {{X}}% expected
- {{$X}} annual spend on fragmented tools
- {{N}} audit findings related to provenance/documentation

**With Summit:**
- Reduce analyst inefficiency by **{{X}}%**
- Increase case throughput by **{{X}}%**
- Consolidate tools, saving **{{$X}}** annually
- Eliminate provenance-related audit findings

**Investment:**
- Pilot: **${{X}}** ({{N}} weeks)
- Production (Year 1): **${{X}}**
- 3-Year TCO: **${{X}}**

**Returns:**
- Annual value: **${{X}}**
- 3-Year net benefit: **${{X}}**
- **ROI: {{X}}%**
- **Payback: {{X}} months**

**Recommendation:** Proceed with {{N}}-week pilot to validate assumptions and success criteria.

---

## 7. Discovery Questions for ROI Inputs

Use these questions to gather data during sales discovery:

**Productivity:**
1. "How many hours per week do analysts spend searching for and correlating data across tools?"
2. "How many different tools/systems do analysts access in a typical investigation?"
3. "What's the average time to complete a case from assignment to close?"

**Throughput:**
4. "How many cases does each analyst handle per month/quarter/year?"
5. "What's your case backlog look like? Are you keeping up with volume?"
6. "If you could handle 30% more cases, what would that be worth?"

**Compliance:**
7. "How much time do analysts spend on documentation and audit preparation?"
8. "Have you had any audit findings related to data provenance or chain-of-custody?"
9. "What does remediating an audit finding cost you (time, money, reputation)?"

**Tools:**
10. "What tools are you currently using for this work? What do they cost?"
11. "Are there tools you could retire or reduce if you had better consolidation?"
12. "What's your annual spend on analyst tooling?"

**Risk:**
13. "Have you had any incidents where you couldn't trace how a conclusion was reached?"
14. "What would a significant missed threat cost you (financial, reputational, mission)?"
15. "How confident are you in your current audit posture?"

**Growth:**
16. "Is your case volume growing? By how much?"
17. "Are you planning to hire more analysts to handle growth?"
18. "What does it cost to hire and onboard a new analyst?"

---

_Version: 2025-11-27 | Update assumptions quarterly based on customer feedback_
