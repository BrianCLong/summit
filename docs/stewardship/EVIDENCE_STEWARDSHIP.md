# Stewardship Evidence Pack

## Overview

This document provides evidence of the Platform Stewardship system in action.

## 1. Drift Detection Output

**Command:** `npx tsx server/src/scripts/stewardship-review.ts`

**Example Output:**
```
[HIGH] COST Drift (daily_burn_rate): +50
[MEDIUM] AGENT Drift (policy_override_rate): +0.04
```

## 2. Forecasts with Caveats

**Example Output:**
```
COST_GROWTH (30 days): 5000
   CI: [4500, 6000]
   Assumptions: Current user growth rate persists, No new LLM models added
```

## 3. Roadmap Pressure Signal

**Example Output:**
```
[Score: 85] COST_EFFICIENCY
   Reason: Accelerating burn rate and projected budget overrun.
   Suggested Investment: FinOps & Resource Optimization
   Evidence:
     - Drift: COST daily_burn_rate (+50)
     - Forecast: COST_GROWTH (5000)
```

## 4. Reproducing Signals

To run the stewardship review and generate current signals:

```bash
cd server
npx tsx src/scripts/stewardship-review.ts
```
