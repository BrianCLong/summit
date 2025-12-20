export const summit = {
  hero: {
    title: "A platform for intelligence workflows that can be audited, governed, and improved.",
    subtitle:
      "Summit focuses on the difficult parts: provenance, policy, trust, and operational clarity—while still enabling fast iteration and deep analytics."
  },
  summary: [
    {
      title: "Ingest → Graph → Insight",
      subtitle: "End-to-end, not piecemeal",
      body:
        "Summit is designed to bring evidence into a coherent graph, preserve lineage, and enable analysis without losing the chain of custody."
    },
    {
      title: "Policy is executable",
      subtitle: "Governance that actually runs",
      body:
        "Rules aren’t PDF documents. Summit treats governance as code: enforceable constraints, review gates, and observable decisions."
    },
    {
      title: "Prediction with accountability",
      subtitle: "Models with receipts",
      body:
        "When prediction exists, it is grounded: inputs are traceable, outputs are interpretable, and the system can answer “why.”"
    }
  ],
  trust: [
    {
      title: "Provenance everywhere",
      subtitle: "Lineage as a first-class artifact",
      body:
        "Transformations, enrichments, merges, and inferences are recorded so humans can audit what happened and when."
    },
    {
      title: "Role- and policy-aware UX",
      subtitle: "Trust boundaries are visible",
      body:
        "Interfaces reflect authorization and policy constraints without confusing users; the UI never implies access that doesn’t exist."
    }
  ],
  measure: [
    "Which sections answer questions vs create confusion",
    "Where users drop off in Summit’s narrative",
    "What technical pages earn deeper time-on-page",
    "Which calls-to-action are credible vs ignored"
  ]
} as const;
