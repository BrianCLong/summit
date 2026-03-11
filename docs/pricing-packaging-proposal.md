# Summit Pricing and Packaging Proposal

## Executive Summary

This proposal defines a three-tier packaging model for Summit, a GraphRAG-based platform for
narrative intelligence, knowledge graph construction, and threat detection. It aligns monetization
with platform capabilities already present in the repository (entity extraction, community detection,
hierarchical summarization, and local querying), while introducing clear commercial gates for scale,
security, and support.

## Target Segments

- Security operations centers (SOC) and cyber response teams
- OSINT and investigative teams
- Enterprise AI governance and trust organizations
- Sovereign and regulated deployments requiring on-prem or air-gapped operation

## Product Tiers and Capability Gates

| Tier | Key Features | Gated Capabilities |
| --- | --- | --- |
| Community (Free) | GraphRAG indexing up to 10 GB; local queries; open-source UI; self-hosted deployment | No support; no enterprise integrations; no SLA; single-node limit |
| Pro ($99/user/month) | Community features plus unlimited indexing; up to 50 connectors (for example Jira and GitHub); parallel runs; API access; SSO | Up to 10 nodes; email support; monthly run caps (10,000 runs/user/month) |
| Enterprise (Custom, starts at $10,000/month) | Pro features plus sovereign on-prem or air-gapped deployment; unlimited nodes and connectors; audit logs; custom LLM support; dedicated support and contractual SLA | Multi-tenant governance controls; SOC2 evidence workflows; 24/7 support and volume discounting |

## Billing and Value Metrics

Summit uses hybrid pricing to align fixed platform value with variable AI workload intensity.

### Community

- Free plan

### Pro

- $99 per user/month (5-seat minimum)
- Usage component:
  - $0.01 per run (GraphRAG query or indexing job)
  - or $0.10 per evidence bundle output report

### Enterprise

- Base: $10,000/month including up to 50 seats and baseline node capacity
- Usage component:
  - $0.005 per run
  - or $5,000 per sovereign node/month for isolated deployments
- Committed volume discount program with annual contracts

## Anchor Pricing Rationale

Pricing is anchored to adjacent market references in OSINT, sovereign AI, knowledge graph, and AI
governance categories:

- Pro tier aligns to prevailing enterprise AI seat benchmarks
- Enterprise tier aligns to sovereign deployment economics and SOC-grade support expectations
- Hybrid seat + usage structure reflects enterprise procurement preference for predictable base
  spend with elastic workload pricing

## Pilot Program (30 to 60 Days)

Offer a conversion-oriented pilot for Pro and Enterprise prospects:

- 30 to 60 days, self-hosted or cloud-hosted demo
- Pilot capacity cap: 5 nodes and 10,000 runs

### Pilot Success Criteria

- At least 80% query accuracy on customer-provided data
- At least 50 evidence bundles generated
- At least 20% investigation time savings, verified via usage logs and workflow analytics

### Conversion Terms

- Seamless paid upgrade at pilot completion
- 20% discount for first three paid months when success criteria are met
- Pilot data persists across conversion to avoid re-indexing friction

## Non-Negotiable Commercial Terms

To protect margin and maintain predictable service quality:

- Annual prepay eligible for 15% discount
- No refunds after first 30 days
- Enforce usage caps with API throttling controls
- IP indemnity posture for Summit-generated GraphRAG outputs
- 90-day termination notice requirement

## Governance and Liability Baseline

- Customer retains responsibility for input-data legality and compliance posture
- Summit disclaims liability for AI hallucinations or model-generated inaccuracies
- SOC2 audit packages available for Enterprise customers on request
- Hosted components may not be reverse-engineered

## Packaging Principles for Execution

1. Tie every premium feature gate to a measurable operating cost or support burden.
2. Keep Community tier useful enough for adoption, but structurally limited for production scale.
3. Keep Pro tier as the default commercial landing zone.
4. Reserve Enterprise economics for sovereignty, compliance, and deep support obligations.
5. Track conversion and expansion by evidence-led KPIs (runs, bundles, and analyst time saved).

## Source Inputs

- Microsoft GraphRAG overview and documentation
- Enterprise AI pricing model analysis references
- OSINT and sovereign tooling benchmark references provided in proposal input
