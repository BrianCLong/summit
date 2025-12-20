# @intelgraph/supply-chain-types

Common type definitions and Zod schemas for the Supply Chain Intelligence System.

## Overview

This package provides comprehensive type definitions for all supply chain entities, including:

- Supply chain nodes and relationships
- Risk assessments and metrics
- Component and material tracking
- Logistics and transportation
- Compliance and regulatory tracking
- Incident management
- Analytics and forecasting
- Third-party vendor management

## Installation

```bash
pnpm add @intelgraph/supply-chain-types
```

## Usage

```typescript
import {
  SupplyChainNode,
  SupplyChainNodeSchema,
  RiskAssessment,
  Component,
  Shipment,
} from '@intelgraph/supply-chain-types';

// Validate data with Zod
const node = SupplyChainNodeSchema.parse({
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'supplier',
  name: 'ACME Components',
  tier: 1,
  status: 'active',
  criticality: 'high',
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Use TypeScript types
const processNode = (node: SupplyChainNode) => {
  console.log(`Processing ${node.name} at tier ${node.tier}`);
};
```

## Type Categories

### Core Entities
- `SupplyChainNode` - Nodes in the supply chain network
- `SupplyChainRelationship` - Relationships between nodes
- `GeographicLocation` - Location information

### Risk Management
- `RiskAssessment` - Risk assessments for nodes
- `FinancialHealthMetrics` - Financial health indicators
- `CybersecurityPosture` - Security posture metrics
- `ESGScore` - Environmental, Social, Governance scores

### Components
- `Component` - Component and material definitions
- `BillOfMaterials` - Bill of materials for products
- `ComponentInventory` - Inventory tracking

### Logistics
- `Shipment` - Shipment tracking
- `CarrierPerformance` - Carrier performance metrics

### Compliance
- `ComplianceRequirement` - Regulatory requirements
- `ComplianceStatus` - Compliance status tracking
- `Certification` - Certifications

### Incidents
- `Incident` - Supply chain incidents
- `Alert` - Real-time alerts

### Analytics
- `DisruptionPrediction` - Predictive analytics
- `SupplyChainMetrics` - Performance metrics

### Vendor Management
- `VendorAssessment` - Vendor assessments
- `Contract` - Contract management

## License

Proprietary - IntelGraph
