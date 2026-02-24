# CompanyOS SDK

Embed Summit's Agentic Intelligence Layer into your existing enterprise stack.

## Overview

CompanyOS treats your enterprise as an Operating System, providing a unified API for:
*   **Agent Orchestration**: Managed by `Jules` and `Codex`.
*   **Graph Intelligence**: Powered by GraphRAG and Neo4j.
*   **Governance**: Enforced by OPA policy gates.

## Quick Start

### Installation

```bash
npm install @summit/companyos
```

### Embedding an Agent

```typescript
import { CompanyOS, Agent } from '@summit/companyos';

const os = new CompanyOS({
  apiKey: process.env.SUMMIT_API_KEY,
  endpoint: 'https://api.summit.internal'
});

async function runAnalystTask() {
  // Initialize the Analyst Agent (Observer)
  const analyst = await os.agents.get('observer-01');

  // execute a task with policy enforcement
  const result = await analyst.execute({
    task: 'Analyze competitor pricing trends',
    constraints: {
      budget: 50.00,
      approvedTools: ['web-search', 'graph-query']
    }
  });

  console.log(`Report generated: ${result.evidenceId}`);
}

runAnalystTask();
```

## Architecture

CompanyOS runs as a sidecar or embedded library, ensuring low latency and zero data egress unless explicitly configured.
