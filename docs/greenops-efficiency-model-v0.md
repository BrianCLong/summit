# GreenOps & Efficiency Model v0

## Purpose

Layer sustainability and efficiency into FinOps and reliability practices so teams can measure, report, and optimize energy/carbon proxies without disrupting product outcomes.

## Core Metrics

- **Energy/Carbon Proxies by Workload**
  - Compute hours by SKU (vCPU/GPU/RAM) × region carbon intensity (gCO₂e/kWh) or provider carbon-free energy (CFE) percentages.
  - Utilization heatmap: average vs. P95 CPU/memory utilization by service tier (prod, pre-prod) and schedule (business vs. off-hours).
  - Data transfer mix: inter-region/egress GB with carbon factors; storage by class (hot/warm/cold) and retention horizon.
- **Per-Tenant / Per-Feature Indicators**
  - Requests, jobs, and model tokens per unit of carbon proxy (e.g., gCO₂e per 1k requests) using shared-service allocation keys (CPU seconds, GB-hours, tokens).
  - Idle vs. active tenant footprint: % of provisioned capacity unused per tenant; feature toggle impact on compute hours.
  - Efficiency scorecards: throughput per watt proxy (requests per CPU-second) and per-dollar to visualize FinOps + GreenOps.
- **Trade-offs**
  - Reliability guardrails: enforce SLO budgets (error budgets, tail latency) and fail-open constraints before rightsizing.
  - Performance vs. efficiency: document when latency SLAs require higher CFE regions vs. lower-latency/high-carbon regions; quantify cost deltas of shifting to spot/arm.
  - Data durability vs. storage tiering: balance retention needs with archival and deletion policies; highlight rehydration costs.

## Optimization Levers

- **Autoscaling & Rightsizing**
  - Default horizontal pod autoscaling (HPA) on CPU+memory with minimum replicas tuned by SLOs; aggressive scale-to-zero for batch/preview environments.
  - Scheduled scaling: reduce floor capacity on off-peak windows; implement sleep/hibernate for dev/test stacks.
  - Rightsize instance SKUs using utilization S-curves; prefer ARM/efficiency SKUs where perf/W is higher and libraries are supported.
- **Workload Placement & Mix**
  - Prefer regions with cleaner grids or higher CFE when latency budgets allow; maintain fallback to primary low-latency regions.
  - Placement policy: co-locate data + compute to minimize transfer; avoid cross-AZ chatty services.
  - Spot/preemptible and savings-plan coverage for interruptible jobs; cap on-demand burn via budgets and alerts.
- **Batch vs. Real-Time**
  - Identify heavy jobs (ETL/model training/report generation) that can shift to batch with deadlines; schedule during off-peak/low-carbon windows.
  - Cache results for repeated queries; use async fan-out for high-volume reads to flatten peaks.
  - Streaming services: enable backpressure and dynamic batching to keep utilization in target bands.

## Reporting & Incentives

- **Dashboards**
  - Carbon proxy dashboard: compute hours × region intensity, utilization by tier, idle vs. active breakdown, and top N inefficient services.
  - Per-tenant/per-feature views: cost + carbon proxy per 1k requests/jobs; show efficiency trends vs. SLAs.
  - Optimization backlog: open rightsizing/autoscaling/placement actions with projected savings and owners.
- **Goals & Budgets**
  - Quarterly efficiency OKRs: e.g., +10% average utilization, −20% idle burn, 50% of batch moved to low-carbon windows.
  - Budget alerts for on-demand creep and idle capacity; require exception tickets for sustained under-utilization <30%.
  - Tie FinOps savings shares to GreenOps progress (e.g., reinvest % of savings into reliability/perf projects).
- **Influence on Design**
  - Architecture reviews must include carbon proxy impact and data-movement analysis; prefer event-driven patterns over chatty sync calls.
  - Default templates include autoscaling, scale-to-zero, and observability for utilization; CI blocks for missing resource requests/limits.
  - Pre-production environments expire automatically unless renewed; enforce storage lifecycle policies in IaC.

## Example Optimization Story (Noisy Service)

- **Context**: Real-time notification fan-out service running 10 pods x medium SKU, average 18% CPU, latency SLO p95 < 250ms.
- **Interventions**:
  - Enabled CPU+memory HPA with min 2 / max 20 pods; added queue-based autoscaling for burst fan-out jobs.
  - Swapped to ARM-optimized medium SKU (same cost, +25% perf/W); enabled gzip + cache headers to cut transfer by 15%.
  - Scheduled dev/staging scale-to-zero at 7pm–7am; moved report aggregation job to off-peak low-carbon region.
- **Results**:
  - Avg utilization increased from 18% → 52%; idle burn reduced ~40%.
  - Carbon proxy lowered ~22% (cleaner region for batch + ARM efficiency) with no SLO regressions.
  - On-demand spend dropped 18%; reinvested savings into latency budget headroom.

## Checklist: "Service is Efficiency-Aware if…"

- [ ] Requests/limits set; HPA enabled on CPU+memory (and queue depth where applicable).
- [ ] Observability: utilization, queue depth, and idle vs. active metrics published with per-tenant/per-feature tags.
- [ ] Scheduled scaling or scale-to-zero for non-24x7 workloads; dev/test environments auto-expire.
- [ ] Region selection reviewed for carbon intensity; batch jobs scheduled in low-carbon/off-peak windows when latency allows.
- [ ] Storage lifecycle policies applied (tiering, expiration, deletion); data transfer minimized via co-location and caching.
- [ ] Spot/preemptible coverage evaluated for interruptible work; budgets/alerts guard against on-demand creep.
- [ ] Architecture/design docs include efficiency trade-offs and rollback plan if SLOs degrade.
