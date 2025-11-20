# Supply Chain Intelligence System - User Guide

## Overview

The Supply Chain Intelligence System is an enterprise-grade platform for comprehensive supply chain monitoring, risk assessment, and resilience management. It provides advanced capabilities surpassing specialized supply chain risk management tools with real-time monitoring, predictive analytics, and deep integration capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Capabilities](#core-capabilities)
3. [Getting Started](#getting-started)
4. [Supply Chain Network Mapping](#supply-chain-network-mapping)
5. [Supplier Risk Assessment](#supplier-risk-assessment)
6. [Third-Party Risk Management](#third-party-risk-management)
7. [Component and Material Tracking](#component-and-material-tracking)
8. [Logistics Intelligence](#logistics-intelligence)
9. [Compliance Monitoring](#compliance-monitoring)
10. [Analytics and Forecasting](#analytics-and-forecasting)
11. [Incident Response](#incident-response)
12. [API Reference](#api-reference)

---

## Architecture

### System Components

The system consists of the following packages and services:

**Packages:**
- `@intelgraph/supply-chain-mapper` - Multi-tier network mapping and visualization
- `@intelgraph/supplier-risk` - Comprehensive supplier risk assessment
- `@intelgraph/third-party-risk` - Vendor lifecycle and continuous monitoring
- `@intelgraph/component-tracker` - BOM management and material tracking
- `@intelgraph/logistics-intel` - Transportation and shipment intelligence
- `@intelgraph/compliance-monitor` - Regulatory compliance tracking

**Services:**
- `supply-chain-service` - Core GraphQL API and orchestration

**Database:**
- PostgreSQL for structured data
- Neo4j for network graph analysis (integration with existing platform)

### Technology Stack

- **Backend:** Node.js, TypeScript, Apollo GraphQL
- **Database:** PostgreSQL 14+, Neo4j 5+
- **Validation:** Zod schemas for runtime type safety
- **Analytics:** Graphology for network analysis
- **Message Queue:** BullMQ for async processing
- **Monitoring:** Pino logging, OpenTelemetry

---

## Core Capabilities

### 1. Supply Chain Network Mapping

**Multi-Tier Supplier Mapping:**
- Track suppliers across 5+ tiers (Tier 1 through Tier 5)
- Visualize complex supply networks with interactive graphs
- Map dependencies and relationships between entities
- Identify geographic distribution and concentration risks

**Dependency Analysis:**
- Critical path identification
- Single points of failure detection
- Bottleneck analysis
- Alternative supplier recommendations
- Network topology metrics

**Key Metrics:**
- Network density and clustering coefficient
- Average path length and centrality scores
- Resilience and diversification scores
- Geographic concentration analysis

### 2. Supplier Risk Assessment

**Financial Health Monitoring:**
- Profitability, liquidity, and solvency scoring
- Bankruptcy risk assessment
- Trend analysis and forecasting
- Credit rating integration

**Cybersecurity Posture:**
- Security control assessment
- Incident history tracking
- Vulnerability management
- Certification tracking (ISO 27001, SOC 2, etc.)

**ESG Scoring:**
- Environmental impact assessment
- Social responsibility metrics
- Governance practices evaluation
- Compliance with ESG standards

**Geopolitical Risk:**
- Country and regional risk scoring
- Political stability monitoring
- Sanctions and export control screening
- Conflict and crisis tracking

**Performance Monitoring:**
- Quality metrics and defect rates
- Delivery performance and on-time rates
- Capacity utilization and scalability
- Customer satisfaction scoring

### 3. Third-Party Risk Management

**Vendor Lifecycle:**
- Onboarding and due diligence workflows
- Continuous monitoring and alerting
- Performance review scheduling
- Exit and transition planning

**Due Diligence:**
- Background checks and reference verification
- Financial and legal reviews
- Security assessments
- Site visits and audits

**Fourth-Party Risk:**
- Sub-supplier identification and tracking
- Inherited risk assessment
- Transparency and visibility scoring

**Access Management:**
- Privilege tracking and reviews
- Access certification workflows
- Anomaly detection
- Segregation of duties monitoring

### 4. Component and Material Tracking

**Bill of Materials (BOM):**
- Engineering, manufacturing, and service BOMs
- Multi-level BOM structures
- Cost rollup and analysis
- Version control and change management

**Component Sourcing:**
- Multi-source tracking and qualification
- Price volatility monitoring
- Market availability intelligence
- Lead time tracking

**Inventory Management:**
- Real-time stock levels
- Reorder point optimization
- Lot and serial number tracking
- Safety stock calculations

**Quality and Compliance:**
- Certification tracking (RoHS, REACH, etc.)
- Conflict minerals reporting
- Counterfeit detection
- Country of origin management

**Lifecycle Management:**
- Obsolescence risk assessment
- End-of-life planning
- Alternative component identification
- Last-time-buy recommendations

### 5. Logistics Intelligence

**Shipment Tracking:**
- Real-time location and status
- Multi-modal transportation support
- Event tracking and exception management
- Estimated vs. actual delivery analysis

**Carrier Performance:**
- On-time delivery metrics
- Damage and loss rates
- Cost efficiency analysis
- Carrier scorecarding

**Route Optimization:**
- Risk-based route analysis
- Multi-segment route planning
- Alternative route recommendations
- Cost-time tradeoff analysis

**Port and Hub Monitoring:**
- Congestion level tracking
- Wait time and dwell time metrics
- Disruption alerts
- Capacity utilization

**Carbon Footprint:**
- Emissions calculation by shipment
- Mode-based footprint analysis
- Reduction opportunity identification
- Offset tracking

### 6. Compliance Monitoring

**Export Controls:**
- ECCN/USML classification
- License requirement determination
- End-use and end-user validation
- Denied party screening

**Sanctions Screening:**
- Automated entity screening
- Multiple sanctions list coverage
- Match resolution workflows
- Continuous monitoring

**Product Safety:**
- Safety standard compliance
- Hazard analysis and risk assessment
- Recall management
- Market authorization tracking

**Environmental Regulations:**
- RoHS, REACH, WEEE compliance
- Restricted substance testing
- Environmental declarations
- Reporting automation

**Trade and Tariffs:**
- HS code classification
- Tariff rate tracking by country
- Trade agreement optimization
- Tariff change alerts

**Audit Management:**
- Audit scheduling and planning
- Finding tracking and resolution
- Certification management
- Surveillance audit tracking

### 7. Analytics and Forecasting

**Predictive Analytics:**
- Disruption risk forecasting
- Demand prediction
- Price volatility forecasting
- Lead time estimation

**Scenario Modeling:**
- What-if analysis
- Stress testing
- Contingency planning
- Impact simulation

**Performance Benchmarking:**
- Industry comparison
- Supplier ranking
- Category analysis
- Best practice identification

**Anomaly Detection:**
- Statistical outlier detection
- Pattern recognition
- Behavioral analysis
- Early warning signals

### 8. Incident Response

**Incident Detection:**
- Automated monitoring and alerting
- Severity classification
- Impact assessment
- Stakeholder notification

**Response Workflows:**
- Playbook automation
- Alternative sourcing activation
- Communication templates
- Escalation procedures

**Recovery Management:**
- Recovery time tracking
- Business continuity activation
- Lessons learned capture
- Root cause analysis

---

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 14+
- Neo4j 5+ (optional, for advanced graph analysis)
- Redis (for job queues)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run database migrations
cd services/supply-chain-service
pnpm run migrate

# Start the service
pnpm run dev
```

### Configuration

Create a `.env` file in `services/supply-chain-service/`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/supply_chain
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379

# Service
PORT=4000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

### Quick Start

1. **Access GraphQL Playground:**
   Open http://localhost:4000/graphql in your browser

2. **Create a Supply Chain Network:**
```graphql
mutation {
  createSupplyChainNetwork(input: {
    name: "Global Supply Network"
    description: "Primary supply chain network"
  }) {
    id
    name
  }
}
```

3. **Perform Supplier Risk Assessment:**
```graphql
mutation {
  performSupplierRiskAssessment(supplierId: "supplier-123") {
    overallRiskScore
    riskLevel
    keyRisks {
      category
      description
      severity
    }
  }
}
```

4. **Track a Shipment:**
```graphql
query {
  trackShipment(trackingNumber: "TRK123456") {
    status
    currentLocation {
      city
      country
    }
    estimatedDeliveryDate
    events {
      timestamp
      eventType
      description
    }
  }
}
```

---

## Supply Chain Network Mapping

### Creating a Network

Networks represent your supply chain topology, including all suppliers, manufacturers, distributors, and other entities.

```typescript
import { NetworkMapper } from '@intelgraph/supply-chain-mapper';

const network: SupplyChainNetwork = {
  id: 'network-1',
  name: 'Global Supply Network',
  tenantId: 'tenant-1',
  nodes: [
    {
      id: 'node-1',
      name: 'Acme Manufacturing',
      type: 'manufacturer',
      tier: 'tier1',
      status: 'active',
      location: {
        country: 'US',
        city: 'Detroit',
      },
      // ... additional fields
    },
    // Add more nodes
  ],
  edges: [
    {
      id: 'edge-1',
      sourceId: 'node-1',
      targetId: 'node-2',
      relationshipType: 'supplies',
      criticality: 'high',
      dependencyScore: 85,
      alternativesAvailable: false,
      // ... additional fields
    },
    // Add more edges
  ],
  metadata: {
    totalNodes: 100,
    totalEdges: 150,
    maxTier: 3,
    geographicSpan: ['US', 'China', 'Germany', 'Mexico'],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mapper = new NetworkMapper(network);
```

### Analyzing the Network

```typescript
// Perform comprehensive analysis
const analysis = mapper.analyzeNetwork();

console.log('Critical Paths:', analysis.criticalPaths);
console.log('Single Points of Failure:', analysis.singlePointsOfFailure);
console.log('Bottlenecks:', analysis.bottlenecks);
console.log('Overall Risk Score:', analysis.overallRiskScore);
console.log('Resilience Score:', analysis.resilienceScore);
```

### Finding Alternative Suppliers

```typescript
const alternatives = mapper.findAlternativeSuppliers('supplier-123');

console.log('Alternative Suppliers:', alternatives.alternatives.map(alt => ({
  supplier: alt.supplierId,
  match: alt.matchScore,
  advantages: alt.advantages,
  disadvantages: alt.disadvantages,
})));
```

### Geographic Distribution Analysis

```typescript
const geoClusters = mapper.analyzeGeographicDistribution();

geoClusters.forEach(cluster => {
  console.log(`${cluster.country}: ${cluster.concentration}% concentration`);
  console.log(`  Risk Score: ${cluster.riskScore}`);
});
```

---

## Supplier Risk Assessment

### Performing a Risk Assessment

```typescript
import { RiskAssessor } from '@intelgraph/supplier-risk';

const assessor = new RiskAssessor();

// Financial health assessment
const financialHealth = assessor.assessFinancialHealth(
  'supplier-123',
  'tenant-1',
  {
    revenueUSD: 50000000,
    netIncomeUSD: 5000000,
    currentRatio: 1.8,
    debtToEquityRatio: 0.7,
    profitMargin: 10.0,
    // ... additional metrics
  },
  'Financial Data Provider'
);

console.log('Financial Health Score:', financialHealth.overallScore);
console.log('Bankruptcy Risk:', financialHealth.bankruptcyRisk);

// Cybersecurity assessment
const cyberPosture = assessor.assessCybersecurityPosture(
  'supplier-123',
  'tenant-1',
  securityControls,
  incidents,
  {
    critical: 0,
    high: 2,
    medium: 5,
    low: 10,
  },
  ['ISO27001', 'SOC2_Type2']
);

console.log('Cybersecurity Score:', cyberPosture.overallScore);
console.log('Risk Level:', cyberPosture.riskLevel);

// Comprehensive assessment
const fullAssessment = assessor.performComprehensiveAssessment(
  'supplier-123',
  'Acme Corp',
  'tenant-1',
  {
    financialHealth,
    cybersecurity: cyberPosture,
    // ... other components
  }
);

console.log('Overall Risk Score:', fullAssessment.overallRiskScore);
console.log('Risk Tier:', fullAssessment.riskTier);
console.log('Approval Status:', fullAssessment.approvalStatus);
```

### Risk Monitoring

Set up continuous monitoring for risk score changes:

```graphql
subscription {
  riskScoreChanged(supplierId: "supplier-123") {
    overallRiskScore
    riskLevel
    keyRisks {
      category
      severity
      description
    }
  }
}
```

---

## Third-Party Risk Management

### Vendor Onboarding

```graphql
mutation {
  onboardVendor(input: {
    name: "Tech Solutions Inc"
    legalName: "Tech Solutions Incorporated"
    industry: "Software Development"
    country: "US"
  }) {
    id
    status
    tier
  }
}
```

### Continuous Monitoring

Configure monitoring rules for automatic vendor assessment:

```typescript
const monitoringRule: MonitoringRule = {
  id: 'rule-1',
  vendorId: 'vendor-123',
  tenantId: 'tenant-1',
  ruleType: 'financial_health',
  condition: 'credit_rating < BBB',
  threshold: { rating: 'BBB' },
  frequency: 'daily',
  alertSeverity: 'high',
  notifyTeam: ['procurement@company.com', 'risk@company.com'],
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### Vendor Alerts

Subscribe to vendor alerts:

```graphql
subscription {
  vendorAlertCreated(vendorId: "vendor-123") {
    id
    alertType
    severity
    title
    description
    detectedAt
  }
}
```

---

## Component and Material Tracking

### Creating a Bill of Materials

```graphql
mutation {
  createBillOfMaterials(input: {
    productId: "product-001"
    productName: "Widget Pro"
    version: "2.0"
    items: [
      {
        componentId: "comp-123"
        quantity: 4
        unit: "EA"
      },
      {
        componentId: "comp-456"
        quantity: 2
        unit: "EA"
      }
    ]
  }) {
    id
    status
    totalMaterialCost
  }
}
```

### Component Sourcing Intelligence

```typescript
const sourcing: ComponentSourcing = {
  componentId: 'comp-123',
  partNumber: 'PN-123456',
  tenantId: 'tenant-1',
  sources: [
    {
      supplierId: 'supplier-1',
      supplierName: 'Preferred Supplier',
      preferenceRank: 1,
      unitPrice: {
        currency: 'USD',
        amount: 15.50,
        effectiveDate: new Date().toISOString(),
      },
      leadTimeDays: 30,
      qualityRating: 95,
      stockAvailability: 'in_stock',
      hasContract: true,
      lastUpdated: new Date().toISOString(),
    },
    // Additional sources...
  ],
  marketAvailability: 'normal',
  priceVolatility: 'stable',
  pricetrend: 'stable',
  singleSourceRisk: false,
  geographicConcentrationRisk: false,
  updatedAt: new Date().toISOString(),
};
```

### Obsolescence Tracking

Monitor components for end-of-life risks:

```typescript
const obsRisk: ObsolescenceRisk = {
  componentId: 'comp-123',
  partNumber: 'PN-123456',
  tenantId: 'tenant-1',
  obsolescenceRisk: 'medium',
  riskScore: 55,
  riskFactors: [
    {
      factor: 'Manufacturer EOL announcement',
      impact: 'high',
      description: 'Component scheduled for EOL in 12 months',
    },
  ],
  productLifecyclePhase: 'decline',
  estimatedEndOfLife: '2025-12-31T00:00:00Z',
  alternativeComponents: [
    {
      componentId: 'comp-789',
      partNumber: 'PN-789',
      compatibility: 'drop_in',
      qualificationStatus: 'qualified',
    },
  ],
  recommendedAction: 'Begin qualification of alternative component',
  lastAssessed: new Date().toISOString(),
  nextReviewDate: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
};
```

---

## Logistics Intelligence

### Shipment Tracking

```graphql
query {
  trackShipment(trackingNumber: "TRK123456") {
    id
    status
    carrier {
      name
      performanceRating
    }
    currentLocation {
      city
      country
      coordinates {
        lat
        lng
      }
    }
    estimatedDeliveryDate
    actualDeliveryDate
    onTimePerformance
    events {
      timestamp
      eventType
      location
      description
      isException
    }
  }
}
```

### Carrier Performance Monitoring

Generate carrier performance reports:

```typescript
const report: CarrierPerformanceReport = {
  id: 'report-1',
  carrierId: 'carrier-123',
  tenantId: 'tenant-1',
  reportingPeriod: {
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
  },
  totalShipments: 1000,
  onTimeShipments: 920,
  delayedShipments: 75,
  lostShipments: 5,
  onTimeDeliveryRate: 92.0,
  averageDelay: 2.5, // days
  averageTransitTime: 5.2,
  damageIncidents: 3,
  claimsFiled: 8,
  performanceRating: 'good',
  recommendations: [
    'Monitor delayed shipments on Route A',
    'Investigate damage incidents in Q4',
  ],
  generatedAt: new Date().toISOString(),
};
```

### Port Intelligence

Monitor port congestion and delays:

```graphql
query {
  portIntelligence(portCode: "USLAX") {
    portName
    status
    congestionLevel
    averageWaitTime
  }
}
```

---

## Compliance Monitoring

### Export Control Classification

```graphql
query {
  exportControlCheck(componentId: "comp-123") {
    eccn
    licenseRequired
    jurisdiction
    status
  }
}
```

### Sanctions Screening

```graphql
mutation {
  performSanctionsScreening(entityId: "entity-123") {
    overallResult
    riskLevel
    matches {
      listName
      matchType
      matchScore
    }
  }
}
```

### Product Recall Management

```graphql
mutation {
  initiateProductRecall(input: {
    productId: "product-001"
    recallType: "VOLUNTARY"
    severity: "HIGH"
    issueDescription: "Potential safety hazard identified"
  }) {
    id
    recallNumber
    status
  }
}
```

### Regulatory Change Monitoring

Subscribe to regulatory changes:

```graphql
subscription {
  regulatoryChangePublished(jurisdiction: "US") {
    regulation
    changeType
    title
    effectiveDate
    impactLevel
    actionRequired
  }
}
```

---

## Analytics and Forecasting

### Supply Chain Health Score

Get an overall health assessment:

```graphql
query {
  supplyChainHealthScore {
    overallScore
    networkResilience
    supplierHealth
    complianceScore
    logisticsPerformance
  }
}
```

### Risk Dashboard

View aggregated risk metrics:

```graphql
query {
  riskDashboard {
    criticalRisks
    highRisks
    mediumRisks
    trendDirection
    topRisks {
      category
      description
      severity
      affectedSuppliers
    }
  }
}
```

---

## Incident Response

### Automated Response Playbooks

Configure automated responses for common incidents:

```typescript
const playbook = {
  trigger: 'supplier_disruption',
  conditions: {
    riskLevel: 'critical',
    tier: 'tier1',
  },
  actions: [
    {
      type: 'notify',
      recipients: ['procurement@company.com', 'operations@company.com'],
      template: 'supplier_disruption_alert',
    },
    {
      type: 'activate_alternatives',
      findAlternatives: true,
      autoApprove: false,
    },
    {
      type: 'assess_impact',
      calculateAffectedProducts: true,
      estimateRecoveryTime: true,
    },
  ],
};
```

---

## API Reference

Full GraphQL API documentation is available in the GraphQL Playground at:
`http://localhost:4000/graphql`

### Key Queries

- `supplyChainNetwork(id)` - Retrieve network by ID
- `analyzeNetwork(networkId)` - Analyze network structure and risks
- `supplierRiskAssessment(supplierId)` - Get supplier risk assessment
- `vendor(id)` - Retrieve vendor details
- `component(id)` - Get component information
- `billOfMaterials(id)` - Retrieve BOM
- `shipment(id)` - Get shipment details
- `trackShipment(trackingNumber)` - Track shipment by number
- `exportControlCheck(componentId)` - Check export controls
- `sanctionsScreening(entityId)` - Screen entity against sanctions lists

### Key Mutations

- `createSupplyChainNetwork(input)` - Create new network
- `updateSupplyChainNode(id, input)` - Update node
- `performSupplierRiskAssessment(supplierId)` - Run risk assessment
- `onboardVendor(input)` - Onboard new vendor
- `createBillOfMaterials(input)` - Create BOM
- `createShipment(input)` - Create shipment
- `performSanctionsScreening(entityId)` - Screen entity
- `initiateProductRecall(input)` - Start product recall

### Key Subscriptions

- `shipmentUpdated(trackingNumber)` - Real-time shipment updates
- `vendorAlertCreated(vendorId)` - Vendor alert notifications
- `riskScoreChanged(supplierId)` - Risk score changes
- `regulatoryChangePublished(jurisdiction)` - Regulatory updates

---

## Support and Resources

For additional support and resources:

- **Documentation:** `/docs/supply-chain/`
- **Risk Framework:** `/docs/supply-chain/RISK_FRAMEWORK.md`
- **API Examples:** `/examples/supply-chain/`
- **Issue Tracker:** GitHub Issues

---

## License

Copyright © 2024 Intelgraph. All rights reserved.
