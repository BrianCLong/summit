# First 90-Day Execution Plan

**Company type:** B2B SaaS intelligence platform  
**Primary debt bucket:** Product sprawl (overlapping modules and Franken-features)

## Objectives
- Reduce product sprawl by consolidating overlapping modules and outcomes.
- Establish canonical paths for core workflows to simplify go-to-market and support.
- Prove usage with telemetry to make evidence-based deprecations.
- Protect revenue and reliability while removing low-value surface area.

## 90-Day Timeline

### Days 0–30: Inventory, Evidence, and Freeze
- Build a complete inventory of products/modules with owner, usage, revenue, and incident rate (Epic 1.1). Use this as the system of record for all decisions.
- Classify each module as **Grow / Maintain / Merge / Retire** with a 6-month horizon (Epic 1.2) and publish to leadership.
- Identify 10 duplicate-outcome areas and select one canonical path for each (Epic 1.3); freeze net-new features in "Retire" zones pending exec + GM approval (Epic 1.4).
- Turn on telemetry to validate real usage for all candidate retirements (Epic 1.6). Block removals without data.

### Days 31–60: Deprecation Rail + Migration Paths
- Publish a deprecation calendar with customer segmentation and impact tiers (Epic 1.5); include compat windows and exception policy.
- Implement migration shims/adapters for callers of legacy functionality (Epic 1.7) and begin dual-run where needed.
- Remove 20% of UI surface that drives <5% usage, with before/after measurement (Epic 1.8).
- Consolidate documentation and in-app navigation around canonical paths (Epic 1.9) to reduce confusion.

### Days 61–90: Cutovers, Compat, and Proof
- Ship "compat mode" for defined windows, then schedule hard cuts (Epic 1.10); keep parity gates and rollback plans.
- Retire legacy paths post-cutover and validate savings, reliability, and support-load improvements (Epic 1.11).
- Publish monthly "what we deleted" report with measured wins (Epic 1.11) and circulate to exec staff.

## Governance and Controls
- Decisions require telemetry-backed evidence; subjective opinions are insufficient.
- Exceptions in "Retire" zones require explicit exec + GM approval.
- All cutovers must include customer segmentation, impact tiers, and rollback criteria.

## Forward-Looking Enhancements
- Add automated "duplicate outcome" detection using feature-level usage graphs to proactively flag future sprawl.
- Create a self-service compat-mode toggle per customer cohort to reduce manual ops during cutovers.
