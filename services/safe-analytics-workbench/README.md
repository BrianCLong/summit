# Safe Analytics Workbench

> Governed environments for exploration and analysis within CompanyOS.

## Overview

The Safe Analytics Workbench provides analysts and data scientists with secure, reproducible, and policy-compliant data access. It enables powerful analysis work without opening side doors for data leaks or shadow systems.

## Features

- **Workspace Management**: Create, manage, and lifecycle analytics workspaces
- **Sandboxed Execution**: Isolated container environments with resource limits
- **Data Access Control**: Tiered data access (Raw, Curated, Anonymized, Synthetic)
- **Egress Controls**: Export limits, watermarking, and approval workflows
- **Audit Logging**: Complete audit trail of all queries and exports
- **Policy Enforcement**: OPA-based fine-grained access control
- **Compliance**: Built-in compliance checks for SOC2, GDPR, HIPAA

## Quick Start

```typescript
import { WorkspaceService, SandboxManager } from '@intelgraph/safe-analytics-workbench';

// Create workspace
const workspace = await workspaceService.createWorkspace({
  name: 'Q4 Churn Analysis',
  type: 'MODEL_DEVELOPMENT',
  justification: 'Analyze customer churn patterns for retention campaign',
  datasetRequests: [
    { datasetId: 'ds-customer-360', provisioningMethod: 'LIVE_VIEW' }
  ]
}, context);

// Workspace is provisioned with sandboxed environment
console.log(`Workspace created: ${workspace.id}`);
```

## Workspace Types

| Type | Use Case | Default TTL |
|------|----------|-------------|
| `AD_HOC` | Quick data investigation | 24 hours |
| `RECURRING_REPORT` | Scheduled reports | 90 days |
| `MODEL_DEVELOPMENT` | ML model development | 30 days |
| `AUDIT_INVESTIGATION` | Compliance investigations | 7 days |
| `SHARED_ANALYSIS` | Team collaboration | 180 days |

## User Roles

| Role | Capabilities |
|------|-------------|
| `ANALYST` | Query, visualize, limited export |
| `DATA_SCIENTIST` | Full compute, model training |
| `ENGINEER` | Admin access, debugging |
| `AUDITOR` | Read-only, full history |

## Documentation

- [Blueprint](../../docs/blueprints/safe-analytics-workbench.md)
- [Compliance Checklist](../../docs/blueprints/analytics-workspace-compliance-checklist.md)
- [Example: Churn Analysis](../../docs/blueprints/examples/tenant-churn-analysis-workspace.yaml)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Safe Analytics Workbench               │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Workspace  │  │   Sandbox   │  │ Governance  │ │
│  │   Service   │  │   Manager   │  │   Engine    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│  ┌──────┴────────────────┴────────────────┴──────┐ │
│  │              Policy Layer (OPA)               │ │
│  └───────────────────────────────────────────────┘ │
│         │                │                │        │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐│
│  │  PostgreSQL │  │    Redis    │  │    Kafka   ││
│  │  (metadata) │  │   (cache)   │  │  (events)  ││
│  └─────────────┘  └─────────────┘  └─────────────┘│
└─────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

UNLICENSED - Internal use only
