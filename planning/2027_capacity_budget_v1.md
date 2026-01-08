# 2027 Capacity & Budget Model (v1)

This markdown replaces the prior binary workbook so the capacity and budget plan remains reviewable in-repo. It links 2027 OKRs to headcount, cloud spend, and margin targets across the four quarters.

## Planning Assumptions

- **Revenue mix**: Tiered ARR with 60% enterprise, 25% growth, 15% self-serve; NRR goal 125% with churn held <6% annually.
- **Workload growth**: +12% QoQ for core workloads; +18% QoQ for marketplace/adapter traffic beginning Q3.
- **COGS baseline (Q4 2026 exit)**: $1.05 per autonomous investigation (all-in compute+storage+L7 security) and 68% gross margin.
- **Hiring timing**: Mid-quarter hires are costed at 50% of a quarter; ramp productivity assumed after one full quarter.
- **Fully loaded cost per FTE (annualized)**: Eng/SRE $240k, Security $255k, CS $190k, Sales Enablement $200k; includes taxes/benefits.
- **Cloud efficiency target**: 12% YoY unit-cost reduction through autoscaling, commitment discounts, and policy-driven workload placement.

## Headcount & Hiring Plan by Function

| Function         | Q4'26 Starting HC | Q1 Adds | Q2 Adds | Q3 Adds | Q4 Adds | 2027 Exit HC | Notes                                                                              |
| ---------------- | ----------------: | ------: | ------: | ------: | ------: | -----------: | ---------------------------------------------------------------------------------- |
| Engineering      |                64 |       6 |       6 |       4 |       2 |           82 | Platform, marketplace, autonomy pods; backfill buffer of 2 embedded in Q1/Q2 adds. |
| SRE              |                14 |       2 |       2 |       1 |       1 |           20 | Coverage for multi-region/SLO error-budget ownership; follow-the-sun rotations.    |
| Security         |                10 |       2 |       1 |       1 |       0 |           14 | AppSec + compliance automation + DR exercise cadence.                              |
| Customer Success |                18 |       3 |       2 |       2 |       2 |           27 | Activation/onboarding SLAs and enterprise expansion coverage.                      |
| Sales Enablement |                 6 |       1 |       1 |       1 |       0 |            9 | Packaging, pricing enforcement, partner readiness.                                 |
| GTM/Partners     |                 8 |       1 |       1 |       1 |       1 |           12 | Marketplace publisher success and ecosystem revenue.                               |
| **Total**        |           **120** |  **15** |  **13** |  **10** |   **6** |      **164** | —                                                                                  |

## Fully Loaded Personnel Cost by Quarter (USD)

| Function         |    Q1 Cost |    Q2 Cost |    Q3 Cost |    Q4 Cost |  2027 Total |
| ---------------- | ---------: | ---------: | ---------: | ---------: | ----------: |
| Engineering      |     $16.8M |     $17.6M |     $18.2M |     $18.6M |      $71.2M |
| SRE              |      $3.4M |      $3.8M |      $4.1M |      $4.3M |      $15.6M |
| Security         |      $2.8M |      $3.0M |      $3.2M |      $3.2M |      $12.2M |
| Customer Success |      $3.0M |      $3.3M |      $3.6M |      $3.9M |      $13.8M |
| Sales Enablement |      $0.9M |      $1.0M |      $1.1M |      $1.1M |       $4.1M |
| GTM/Partners     |      $1.0M |      $1.1M |      $1.2M |      $1.3M |       $4.6M |
| **Total**        | **$27.9M** | **$29.8M** | **$31.4M** | **$32.4M** | **$121.5M** |

> Costs reflect mid-quarter hiring proration and assume stable benefits ratios; add 3–4% buffer for merit/market adjustments.

## Cloud & Platform Spend

| Category                      |        Q1 |         Q2 |         Q3 |         Q4 | Notes                                                                    |
| ----------------------------- | --------: | ---------: | ---------: | ---------: | ------------------------------------------------------------------------ |
| Compute (K8s, GPU/CPU)        |     $5.2M |      $5.6M |      $6.3M |      $6.6M | Includes 10% reserved/commit uplift; GPU-heavy Q3 marketplace inference. |
| Storage (object + DB)         |     $1.6M |      $1.8M |      $2.0M |      $2.1M | Growth tied to signed-receipt retention and multi-region replicas.       |
| Networking & CDN              |     $0.9M |      $1.0M |      $1.1M |      $1.2M | Private networking add-ons ramp; CDN for trust center snapshots.         |
| Security & Compliance Tooling |     $0.7M |      $0.8M |      $0.9M |      $0.9M | Scanner seats, SBOM attestations, evidence storage.                      |
| Observability                 |     $0.5M |     $0.55M |      $0.6M |      $0.6M | OTel pipeline, log retention tuned per SLO/error budgets.                |
| Third-Party Services          |     $0.6M |     $0.65M |      $0.7M |     $0.75M | Payments, CRM enrichment, geo-IP, trust verification APIs.               |
| **Total Cloud/Platform**      | **$9.5M** | **$10.4M** | **$11.6M** | **$12.2M** | —                                                                        |

## Gross Margin and Unit Economics

| Quarter | Revenue (plan) |   COGS | Gross Margin | Unit Cost per Autonomous Investigation | Drivers                                                                    |
| ------- | -------------: | -----: | -----------: | -------------------------------------: | -------------------------------------------------------------------------- |
| Q1      |           $32M | $10.1M |        68.4% |                                  $1.00 | Reserved capacity negotiation + policy-driven autoscaling.                 |
| Q2      |           $35M | $11.1M |        68.3% |                                  $0.97 | Metering accuracy → fewer write-offs; early BYOK adoption cost offset.     |
| Q3      |           $39M | $12.7M |        67.4% |                                  $0.96 | Marketplace inference mix raises compute; mitigated by workload placement. |
| Q4      |           $43M | $13.6M |        68.4% |                                  $0.90 | Autonomy margin lift and FinOps controls; error-budget burn reduction.     |

## Scenario & Sensitivity Highlights

- **Growth vs. Spend**: Every 5% drop in NRR reduces annual revenue by ~$7M; to preserve ≥66% GM, reduce contractor usage and delay 2 Eng + 1 SRE hires by one quarter.
- **Runaway COGS trigger**: If unit cost exceeds $1.10 for 2 consecutive months, invoke FinOps playbook (workload bin-packing, GPU right-sizing, and burst-to-spot throttling) and freeze non-critical scale tests.
- **Enterprise procurement drag**: If enterprise close rate slips by 15% in any quarter, pivot 2 GTM/Partners hires to self-serve growth and cut Q3 CDN expansion by 20%.
- **Resiliency uplift budget**: DR multi-region proof is reserved at $1.2M in Q2–Q3; defer to Q4 if SLO burn stays <20% of budget.

## Alignment with Stage Gates & Evidence

- Each hiring tranche is tied to Stage Gate outcomes: **Spec** (role justification + KPI deltas), **Build** (offer approvals), **Prove** (productivity evidence after one quarter), **Operate** (on-call and SLO coverage), **Package** (budget receipts filed).
- Decision Receipts must cite cost center, expected KPI movement (ARR, margin, activation), and telemetry/evidence sources (billing ledger, SLO dashboards, trust center snapshots).

## Export & Refresh Cadence

- **Source of truth**: This markdown file; CSV export can be generated from the tables for finance ingest.
- **Refresh schedule**: Update monthly with actuals vs. plan and attach receipts for any variances >5% in headcount or cloud spend.
- **Ownership**: FP&A lead maintains the model; SRE/FinOps supply COGS actuals; HRBP tracks hiring slip/acceleration.
