# CompanyOS SDK Quickstart

> **"Summit is the auditable, agentic intelligence layer for investigations that must stand up in court, compliance, or crisis."**

CompanyOS SDK is the "Stripe for Intelligence". It allows you to embed powerful, auditable agentic capabilities into your existing Node.js/TypeScript backend in under an hour. You do not replace your stack; you augment it.

## 1. Installation

```bash
pnpm add @intelgraph/sdk
```

## 2. Configuration

Initialize the SDK with your API key. This provides access to both the core intelligence graph and the governance layer.

```typescript
import { createSummitSDK, IntelGraphCoreClient } from '@intelgraph/sdk';

// Initialize the Governance Layer (Policy, Compliance, Evidence)
const sdk = createSummitSDK({
  apiKey: process.env.SUMMIT_API_KEY,
  baseUrl: 'https://api.summit.intelgraph.ai'
});

// Initialize the Core Intelligence Layer (Entities, Graphs, Analytics)
const core = new IntelGraphCoreClient({
  TOKEN: process.env.SUMMIT_API_KEY,
});
```

## 3. Hello Intelligence: A 3-Step Walkthrough

### Step 1: Investigate an Entity

Feed an entity into the graph to start an investigation. Summit agents will enrich it and map relationships.

```typescript
const graphId = 'investigation-2024-001';

// 1. Create an entity in the graph
const target = await core.entities.postGraphsEntities({
  graphId,
  requestBody: {
    name: 'Suspicious Corp Ltd',
    type: 'organization',
    properties: {
      registration_number: '12345678',
      jurisdiction: 'offshore-haven'
    }
  }
});

console.log(`Tracked target: ${target.id}`);
```

### Step 2: Monitor the Graph

Set up a monitor to detect specific patterns (e.g., sanction evasion, money laundering).

```typescript
// 2. Analyze the graph for risk patterns
const insights = await core.graphAnalytics.getGraphsInsights({
  graphId,
  severity: 'high'
});

const risks = insights.insights?.filter(i => i.type === 'risk') || [];
if (risks.length > 0) {
  console.log('High risk detected:', risks.map(r => r.description));
}
```

### Step 3: Explain the Decision (Governance)

Every automated decision must be explainable. Generate an evidence bundle that is cryptographically signed and audit-ready.

```typescript
// 3. Create an immutable evidence record
const evidence = await sdk.compliance.createEvidence({
  type: 'investigation_report',
  title: `Risk Report for ${target.name}`,
  content: {
    targetId: target.id,
    riskCount: risks.length,
    topology: insights.coverage, // The subgraph coverage
    policyVersion: 'v2.1.0'
  },
  tags: ['compliance', 'pci-dss']
});

console.log(`Evidence created: ${evidence.id}`);
console.log(`Audit Trail: ${evidence.provenanceChainId}`); // If available in Evidence type
```

## Next Steps

*   **[Governance API Reference](./GOVERNANCE.md)**: Deep dive into Policy and Evidence.
*   **[Agent Mesh](./AGENTS.md)**: How to define custom agent behaviors.
