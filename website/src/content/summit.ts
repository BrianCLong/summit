/**
 * Summit content
 */
export const summit = {
  hero: {
    title:
      'A platform for intelligence workflows that can be audited, governed, and improved.',
    subtitle:
      'Summit focuses on the difficult parts: provenance, policy, trust, and operational clarity—while still enabling fast iteration and deep analytics.',
  },
  summary: [
    {
      title: 'Ingest → Graph → Insight',
      subtitle: 'End-to-end, not piecemeal',
      body: 'Summit is designed to bring evidence into a coherent graph, preserve lineage, and enable analysis without losing the chain of custody.',
    },
    {
      title: 'Policy is executable',
      subtitle: 'Governance that actually runs',
      body: "Rules aren't PDF documents. Summit treats governance as code: enforceable constraints, review gates, and observable decisions.",
    },
    {
      title: 'Prediction with accountability',
      subtitle: 'Models with receipts',
      body: 'When prediction exists, it is grounded: inputs are traceable, outputs are interpretable, and the system can answer "why."',
    },
  ],
  trust: [
    {
      title: 'Provenance everywhere',
      subtitle: 'Lineage as a first-class artifact',
      body: 'Transformations, enrichments, merges, and inferences are recorded so humans can audit what happened and when.',
    },
    {
      title: 'Role- and policy-aware UX',
      subtitle: 'Trust boundaries are visible',
      body: "Interfaces reflect authorization and policy constraints without confusing users; the UI never implies access that doesn't exist.",
    },
  ],
  measure: [
    'Which sections answer questions vs create confusion',
    "Where users drop off in Summit's narrative",
    'What technical pages earn deeper time-on-page',
    'Which calls-to-action are credible vs ignored',
  ],
  capabilities: {
    evidence: {
      title: 'Evidence ingest',
      subtitle: 'Bring data in without losing meaning',
      items: [
        'Structured and semi-structured sources',
        'Normalization + entity resolution boundaries',
        'Retention of original artifacts and transforms',
      ],
    },
    graph: {
      title: 'Graph intelligence',
      subtitle: 'Relationships as the primary model',
      items: [
        'Typed nodes/edges and ontology discipline',
        'Hypothesis overlays and competing narratives',
        'Explainable queries and evidence trails',
      ],
    },
    governance: {
      title: 'Governance & policy',
      subtitle: 'Rules that execute',
      items: [
        'Policy gating for sensitive actions',
        'Change control and review workflows',
        'Audit-friendly decision logs',
      ],
    },
    provenance: {
      title: 'Provenance',
      subtitle: 'Everything has receipts',
      description:
        'Provenance is a product surface: not a compliance appendix. Lineage is queryable and can be surfaced per object, transform, and analysis step.',
      schema:
        'Provenance = { who, what, when, why, inputs[], outputs[], policy_context }',
    },
  },
  architecture: {
    primitives: [
      {
        primitive: 'Evidence object',
        purpose: 'Immutable reference to source artifact',
        why: 'Enables auditability + reprocessing',
      },
      {
        primitive: 'Transform step',
        purpose: 'Explicit mapping from inputs → outputs',
        why: 'Prevents invisible changes',
      },
      {
        primitive: 'Policy context',
        purpose: 'Executable constraints around actions/data',
        why: 'Makes governance real',
      },
      {
        primitive: 'Narrative overlay',
        purpose: 'Human interpretation without mutating facts',
        why: 'Separates evidence from hypotheses',
      },
    ],
    qualities: [
      {
        title: 'Obvious-to-auditors',
        subtitle: 'Designed for review',
        body: 'The architecture makes it easy to answer: what happened, who did it, why it was permitted, and what evidence supports the current state.',
      },
      {
        title: 'Obvious-to-operators',
        subtitle: 'Designed for operations',
        body: 'Operational workflows are first-class: health endpoints, predictable deployments, measurable behaviors, and a clear separation of concerns.',
      },
    ],
  },
  security: {
    principles: [
      {
        title: 'Least privilege by default',
        subtitle: 'Authorization shapes the UI',
        body: "Interfaces are policy-aware and never imply actions or access that aren't permitted. The product surface matches the enforcement surface.",
      },
      {
        title: 'Auditability',
        subtitle: 'Explain the action, not just the outcome',
        body: 'Summit emphasizes decision logs, policy contexts, and provenance trails so reviewers can understand why something was allowed.',
      },
    ],
  },
  useCases: [
    {
      title: 'Evidence triage + entity resolution',
      subtitle: 'Separate facts from guesses',
      body: 'Ingest artifacts, normalize entities with explicit confidence boundaries, and preserve the "before" state so the system can be re-evaluated.',
    },
    {
      title: 'Governed hypothesis building',
      subtitle: 'Competing narratives without mutating evidence',
      body: 'Analysts build overlays that reference evidence objects and transforms, producing a traceable narrative without rewriting the underlying graph.',
    },
  ],
  roadmap: {
    now: {
      title: 'Now',
      subtitle: 'Make the system operationally obvious',
      items: [
        'Harden provenance UX',
        'Policy enforcement visibility',
        'First-party analytics + learnings',
      ],
    },
    next: {
      title: 'Next',
      subtitle: 'Scale and specialize',
      items: [
        'Richer overlays',
        'Stronger evaluation discipline',
        'Operational playbooks',
      ],
    },
    later: {
      title: 'Later',
      subtitle: 'Ecosystem expansion',
      items: [
        'Additional initiatives under Topicality',
        'More tools and publications',
        'Deeper partner surfaces',
      ],
    },
  },
  faqs: [
    {
      q: 'Is Summit a product or a platform?',
      a: 'A platform with product surfaces. It must operate, be audited, and evolve.',
    },
    {
      q: 'What makes Summit different?',
      a: 'It treats trust (policy + provenance) as a first-class product surface, not an afterthought.',
    },
    {
      q: 'How do you handle uncertainty?',
      a: 'By recording boundaries—confidence, provenance, and hypotheses—rather than smearing guesses into facts.',
    },
  ],
} as const;
