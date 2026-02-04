# CompanyOS SDK: Embed Intelligence

**CompanyOS SDK** is the embedded intelligence layer for the Summit platform. Unlike monolithic platforms that demand full migration, CompanyOS allows developers to inject agentic orchestration and knowledge graph capabilities directly into existing applications.

## Core Value Proposition

> **"Embed intelligence, don't replace infrastructure."**

CompanyOS focuses on three pillars:
1.  **Agentic Orchestration:** Deploy autonomous agents (Jules, Codex, Observer) that act on your data.
2.  **Knowledge Graph Context:** Automatically assemble retrieval-augmented generation (RAG) contexts from structured enterprise data.
3.  **Governance as Code:** Every agent action is policy-gated and audit-logged on the ledger.

## Competitive Differentiation (vs. Palantir AIP)

| Feature | Palantir AIP | CompanyOS SDK |
| :--- | :--- | :--- |
| **Deployment** | SaaS / Heavy On-Prem | Embeddable Library / Container |
| **DevEx** | Low-Code / Proprietary | Code-First / Open Standards (TS/Python) |
| **Lock-in** | High (Ontology Lock) | Low (Export to standard formats) |
| **Speed to Value** | Months (Forward Deployed) | Days (npm install) |
| **Governance** | Opaquely Integrated | Transparent Side-Chain Ledger |

## Usage Example

```typescript
import { Agent, CompanyOS } from '@intelgraph/maestro-sdk';

const os = new CompanyOS({
  graph: 'neo4j://localhost',
  policy: 'strict'
});

const jules = os.spawnAgent('jules');

await jules.act('analyze_security_posture', { target: 'deployment-prod' });
```
