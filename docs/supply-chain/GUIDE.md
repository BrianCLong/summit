# Supply Chain Intelligence System - User Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Features](#core-features)
5. [API Reference](#api-reference)
6. [Use Cases](#use-cases)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

The Supply Chain Intelligence System is a comprehensive platform for monitoring, analyzing, and managing complex global supply chain networks. It provides enterprise-grade capabilities for:

- **Supply Chain Mapping**: Multi-tier supplier network visualization and analysis
- **Risk Assessment**: Financial, cyber, ESG, geopolitical, and operational risk evaluation
- **Compliance Monitoring**: Export control, sanctions, conflict minerals, and regulatory tracking
- **Component Tracking**: Material sourcing, inventory, obsolescence, and counterfeit detection
- **Logistics Intelligence**: Real-time shipment tracking, route optimization, carrier performance
- **Predictive Analytics**: Disruption forecasting, scenario modeling, trend analysis
- **Incident Response**: Alert management, automated response, business continuity planning

### Key Benefits

- **360° Visibility**: Complete transparency across multi-tier supply networks
- **Proactive Risk Management**: Identify and mitigate risks before they become issues
- **Regulatory Compliance**: Automated compliance tracking and reporting
- **Cost Optimization**: Route optimization, supplier diversification, inventory optimization
- **Resilience**: Enhanced supply chain resilience through predictive analytics
- **Decision Support**: Data-driven insights for strategic planning

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Applications                         │
│  (Dashboards, Visualizations, Reports, Management UI)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    API Gateway                               │
│              (Authentication, Rate Limiting)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼────────┐ ┌───▼──────────────┐
│Supply Chain  │ │Risk Assess. │ │Integration       │
│Service       │ │Service      │ │Services          │
└──────┬───────┘ └────┬────────┘ └───┬──────────────┘
       │              │              │
       └──────────────┼──────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼─────┐ ┌─────▼────────┐
│Packages      │ │Database │ │External APIs │
│(Mapper, Risk,│ │(Postgres│ │(Carriers,    │
│ Tracker,     │ │ Neo4j,  │ │ Regulatory,  │
│ Logistics,   │ │ Redis)  │ │ Weather, etc)│
│ Compliance)  │ │         │ │              │
└──────────────┘ └─────────┘ └──────────────┘
```

### Package Structure

- **@intelgraph/supply-chain-types**: Common type definitions and Zod schemas
- **@intelgraph/supply-chain-mapper**: Network mapping, topology analysis, visualization
- **@intelgraph/supplier-risk**: Risk assessment for suppliers (financial, cyber, ESG)
- **@intelgraph/third-party-risk**: Vendor lifecycle management and monitoring
- **@intelgraph/component-tracker**: Material tracking, inventory, obsolescence
- **@intelgraph/logistics-intel**: Shipment tracking, route optimization, carrier performance
- **@intelgraph/compliance-monitor**: Regulatory compliance, export control, certifications

### Services

- **supply-chain-service** (Port 4020): Core orchestration and network management
- **risk-assessment-service** (Port 4021): Risk assessment, incidents, analytics

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+ (for relational data)
- Neo4j 5+ (optional, for graph queries)
- Redis 7+ (optional, for caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourorg/supply-chain-intelligence.git
cd supply-chain-intelligence

# Install dependencies
pnpm install

# Build packages
pnpm -r build

# Start services in development mode
pnpm -F supply-chain-service dev
pnpm -F risk-assessment-service dev
```

### Configuration

Create `.env` files in each service directory:

```bash
# services/supply-chain-service/.env
PORT=4020
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@localhost:5432/supply_chain
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://localhost:6379
```

```bash
# services/risk-assessment-service/.env
PORT=4021
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@localhost:5432/supply_chain
```

## Core Features

### 1. Supply Chain Mapping and Visualization

#### Network Topology Analysis

```typescript
import { NetworkAnalyzer } from '@intelgraph/supply-chain-mapper';

const analyzer = new NetworkAnalyzer();

// Analyze network structure
const topology = analyzer.analyzeTopology(nodes, relationships);
console.log(`Total nodes: ${topology.totalNodes}`);
console.log(`Network density: ${topology.networkDensity}`);
console.log(`Average path length: ${topology.averagePathLength}`);
```

**API Endpoint:**
```bash
GET /api/network/topology
```

#### Critical Path Identification

```typescript
// Find critical paths between suppliers
const criticalPath = analyzer.findCriticalPaths(
  'supplier-a-id',
  'manufacturer-id',
  nodes,
  relationships
);

console.log(`Path: ${criticalPath.path.join(' -> ')}`);
console.log(`Total lead time: ${criticalPath.totalLeadTime} days`);
console.log(`Bottlenecks: ${criticalPath.bottlenecks.length}`);
console.log(`Single points of failure: ${criticalPath.singlePointsOfFailure.length}`);
```

**API Endpoint:**
```bash
POST /api/network/critical-path
{
  "sourceNodeId": "uuid",
  "targetNodeId": "uuid"
}
```

#### Interactive Visualization

```typescript
import { VisualizationService } from '@intelgraph/supply-chain-mapper';

const visService = new VisualizationService();

// Generate visualization graph
const graph = visService.toVisualizationGraph(
  nodes,
  relationships,
  'hierarchical' // or 'force', 'geographic', 'circular'
);

// Use with D3.js, Cytoscape.js, or vis.js
```

**API Endpoint:**
```bash
GET /api/network/visualization?layout=hierarchical
```

### 2. Supplier Risk Assessment

#### Comprehensive Risk Assessment

```typescript
import { SupplierRiskAssessor } from '@intelgraph/supplier-risk';

const assessor = new SupplierRiskAssessor();

const assessment = await assessor.assessSupplier(
  supplierNode,
  financialMetrics,
  cyberPosture,
  esgScore
);

console.log(`Overall Risk Score: ${assessment.overallRiskScore}/100`);
console.log(`Risk Level: ${assessment.overallRiskLevel}`);

// Review recommendations
assessment.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});

// Review mitigation priorities
assessment.mitigationPriorities.forEach(({ category, priority, action }) => {
  console.log(`[${priority}] ${category}: ${action}`);
});
```

**API Endpoint:**
```bash
POST /api/risk/supplier/:nodeId/assess
{
  "financialMetrics": {
    "revenue": 10000000,
    "profitMargin": 0.15,
    "debtToEquity": 0.8,
    "creditRating": "BBB"
  },
  "cyberPosture": {
    "securityScore": 75,
    "certifications": ["ISO 27001", "SOC 2"],
    "vulnerabilities": { "critical": 0, "high": 2, "medium": 5, "low": 10 }
  },
  "esgScore": {
    "overallScore": 72,
    "environmentalScore": 75,
    "socialScore": 70,
    "governanceScore": 71
  }
}
```

#### Risk Categories

1. **Financial Risk**
   - Credit ratings
   - Profitability metrics
   - Debt levels
   - Bankruptcy probability

2. **Cybersecurity Risk**
   - Security certifications
   - Vulnerability counts
   - Incident history
   - Security posture score

3. **ESG Risk**
   - Environmental impact
   - Labor practices
   - Governance quality
   - Compliance violations

4. **Geopolitical Risk**
   - Country risk
   - Sanctions exposure
   - Political stability
   - Trade restrictions

5. **Operational Risk**
   - Delivery performance
   - Quality metrics
   - Capacity constraints
   - Tier depth

### 3. Third-Party Risk Management

#### Vendor Onboarding

```typescript
import { ThirdPartyRiskManager } from '@intelgraph/third-party-risk';

const manager = new ThirdPartyRiskManager();

// Initiate onboarding
const onboarding = manager.initiateOnboarding(vendorId, 'ACME Corporation');

// Track onboarding progress
onboarding.checklist.forEach(item => {
  console.log(`${item.item}: ${item.status}`);
});
```

**API Endpoint:**
```bash
POST /api/vendor/onboard
{
  "vendorId": "uuid",
  "vendorName": "ACME Corporation"
}
```

#### Continuous Vendor Monitoring

```typescript
const monitoring = await manager.monitorVendor(vendorId, {
  assessmentFrequency: 'quarterly',
  securityMonitoring: true,
  financialMonitoring: true,
  complianceMonitoring: true,
  performanceMonitoring: true,
  alertThresholds: {
    riskScoreDecrease: 10,
    securityIncident: true,
    complianceViolation: true,
    performanceDegradation: 0.1,
  },
});

console.log(`Status: ${monitoring.status}`);
console.log(`Current Risk Score: ${monitoring.metrics.currentRiskScore}`);
console.log(`Trend: ${monitoring.metrics.trend}`);
```

**API Endpoint:**
```bash
POST /api/vendor/:vendorId/monitor
{
  "config": {
    "assessmentFrequency": "quarterly",
    "securityMonitoring": true,
    "alertThresholds": { ... }
  }
}
```

### 4. Component and Material Tracking

#### Component Availability

```typescript
import { ComponentTracker } from '@intelgraph/component-tracker';

const tracker = new ComponentTracker();

const availability = await tracker.checkAvailability(
  componentId,
  requiredQuantity,
  inventory,
  component
);

console.log(`Available: ${availability.availableQuantity}`);
console.log(`Lead Time: ${availability.leadTimeDays} days`);
console.log(`Risk Level: ${availability.riskLevel}`);

// Check alternatives
availability.alternatives.forEach(alt => {
  console.log(`Alternative: ${alt.partNumber} (${alt.substitutionRisk} risk)`);
});
```

**API Endpoint:**
```bash
GET /api/components/:id/availability?quantity=1000
```

#### Price Volatility Analysis

```typescript
const volatility = tracker.analyzePriceVolatility(componentId, historicalPrices);

console.log(`Current Price: $${volatility.currentPrice}`);
console.log(`Trend: ${volatility.trend}`);
console.log(`Volatility Score: ${volatility.volatilityScore}`);
console.log(`30-day change: ${volatility.priceChangePercent30Days.toFixed(2)}%`);

// Review forecast
volatility.forecast.forEach(({ date, predictedPrice, confidence }) => {
  console.log(`${date.toLocaleDateString()}: $${predictedPrice.toFixed(2)} (${confidence}% confidence)`);
});
```

#### Counterfeit Detection

```typescript
const authCheck = await tracker.detectCounterfeit(
  componentId,
  serialNumber,
  {
    manufacturerCode: 'ABC123',
    batchNumber: 'BATCH-2024-01',
    rfidData: '0123456789ABCDEF',
  }
);

console.log(`Authentic: ${authCheck.authentic}`);
console.log(`Confidence: ${authCheck.confidence}%`);
console.log(`Recommendation: ${authCheck.recommendation}`);
```

### 5. Logistics and Transportation Intelligence

#### Real-Time Shipment Tracking

```typescript
import { LogisticsTracker } from '@intelgraph/logistics-intel';

const tracker = new LogisticsTracker();

const tracking = await tracker.trackShipment(trackingNumber);

console.log(`Status: ${tracking.currentStatus}`);
console.log(`Current Location: ${tracking.currentLocation.city}, ${tracking.currentLocation.country}`);
console.log(`ETA: ${tracking.estimatedArrival}`);

// Check for delays and alerts
tracking.delays.forEach(delay => {
  console.log(`Delay: ${delay.reason} (${delay.delayHours} hours)`);
});

tracking.alerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.message}`);
});
```

**API Endpoint:**
```bash
GET /api/shipments/:trackingNumber/track
```

#### Route Optimization

```typescript
const optimization = tracker.optimizeRoute(origin, destination, {
  prioritizeSpeed: true,
  maxDays: 7,
  prioritizeEnvironmental: false,
});

console.log(`Recommended: ${optimization.recommendedRoute.mode}`);
console.log(`Cost: $${optimization.recommendedRoute.estimatedCost}`);
console.log(`Days: ${optimization.recommendedRoute.estimatedDays}`);
console.log(`CO2: ${optimization.recommendedRoute.carbonEmissions} kg`);

// Review alternatives
optimization.alternativeRoutes.forEach(route => {
  console.log(`\nAlternative: ${route.mode}`);
  route.tradeoffs.forEach(tradeoff => console.log(`  ${tradeoff}`));
});
```

**API Endpoint:**
```bash
POST /api/logistics/optimize-route
{
  "origin": { "country": "China", "city": "Shanghai", "latitude": 31.2304, "longitude": 121.4737 },
  "destination": { "country": "USA", "city": "Los Angeles", "latitude": 34.0522, "longitude": -118.2437 },
  "requirements": { "prioritizeSpeed": true }
}
```

### 6. Compliance Monitoring

#### Export Control Screening

```typescript
import { ComplianceMonitor } from '@intelgraph/compliance-monitor';

const monitor = new ComplianceMonitor();

const screening = await monitor.screenExportControl(
  entityId,
  'Supplier Name',
  'China'
);

console.log(`Result: ${screening.result}`);
console.log(`Screened against: ${screening.screenedAgainst.join(', ')}`);

// Review matches
screening.matches.forEach(match => {
  console.log(`Match: ${match.listName} (${match.confidence * 100}% confidence)`);
  console.log(`Details: ${match.details}`);
});

// Follow recommendations
screening.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});
```

**API Endpoint:**
```bash
POST /api/compliance/export-control/screen
{
  "entityId": "uuid",
  "entityName": "Supplier Name",
  "country": "China"
}
```

#### Conflict Minerals Assessment

```typescript
const assessment = await monitor.assessConflictMinerals(componentId, {
  materials: [
    { name: 'Tin', source: 'Rwanda' },
    { name: 'Gold', source: 'DRC' },
  ],
});

console.log(`Contains Conflict Minerals: ${assessment.containsConflictMinerals}`);
console.log(`DRC Compliant: ${assessment.drcCompliant}`);

assessment.minerals.forEach(mineral => {
  console.log(`${mineral.mineral}: ${mineral.conflictFree ? 'Conflict-Free' : 'Not Certified'}`);
});
```

**API Endpoint:**
```bash
POST /api/compliance/conflict-minerals/:componentId
{
  "bomData": {
    "materials": [
      { "name": "Tin", "source": "Rwanda" },
      { "name": "Gold", "source": "DRC" }
    ]
  }
}
```

### 7. Incident and Alert Management

#### Create and Track Incidents

```bash
# Create incident
POST /api/incidents
{
  "type": "disruption",
  "title": "Port Congestion at Shanghai",
  "description": "Severe congestion affecting shipments",
  "severity": "high",
  "affectedNodes": ["node-1", "node-2"],
  "status": "open"
}

# Update incident
PUT /api/incidents/:id
{
  "status": "mitigating",
  "mitigationActions": [
    {
      "action": "Reroute shipments to alternate port",
      "status": "in-progress"
    }
  ]
}
```

#### Alert Management

```bash
# Get active alerts
GET /api/alerts?resolved=false&severity=high

# Acknowledge alert
POST /api/alerts/:id/acknowledge
{
  "userId": "user-123"
}

# Resolve alert
POST /api/alerts/:id/resolve
```

## Use Cases

### Use Case 1: New Supplier Onboarding

**Scenario**: Your company wants to onboard a new critical supplier in China.

**Steps:**

1. **Initiate Onboarding**
   ```bash
   POST /api/vendor/onboard
   {
     "vendorId": "new-supplier-id",
     "vendorName": "Shanghai Electronics Co."
   }
   ```

2. **Conduct Risk Assessment**
   ```bash
   POST /api/risk/supplier/new-supplier-id/assess
   {
     "financialMetrics": { ... },
     "cyberPosture": { ... },
     "esgScore": { ... }
   }
   ```

3. **Screen Against Export Controls**
   ```bash
   POST /api/compliance/export-control/screen
   {
     "entityId": "new-supplier-id",
     "entityName": "Shanghai Electronics Co.",
     "country": "China"
   }
   ```

4. **Review Recommendations**
   - Risk assessment recommendations
   - Compliance screening results
   - Due diligence checklist completion

5. **Make Decision**
   - Approve with conditions
   - Reject
   - Request additional information

### Use Case 2: Supply Chain Disruption Response

**Scenario**: A major port experiences severe congestion, affecting 50+ shipments.

**Steps:**

1. **Detect Disruption**
   ```bash
   GET /api/logistics/ports/Shanghai/congestion
   ```

2. **Create Incident**
   ```bash
   POST /api/incidents
   {
     "type": "disruption",
     "title": "Shanghai Port Congestion",
     "severity": "critical",
     "affectedShipments": ["ship-1", "ship-2", ...]
   }
   ```

3. **Generate Alerts**
   ```bash
   POST /api/alerts
   {
     "type": "logistics-delay",
     "severity": "high",
     "message": "50+ shipments delayed due to port congestion"
   }
   ```

4. **Find Alternative Routes**
   ```bash
   POST /api/logistics/optimize-route
   {
     "origin": { ... },
     "destination": { ... },
     "requirements": { "prioritizeSpeed": true }
   }
   ```

5. **Update Stakeholders**
   - Notify affected customers
   - Coordinate with logistics providers
   - Implement alternative routes

6. **Close Incident**
   ```bash
   PUT /api/incidents/:id
   {
     "status": "resolved",
     "resolvedAt": "2024-01-15T10:00:00Z",
     "lessonsLearned": "Diversify port usage..."
   }
   ```

### Use Case 3: Component Obsolescence Management

**Scenario**: A critical component is at risk of obsolescence.

**Steps:**

1. **Assess Obsolescence Risk**
   ```bash
   GET /api/components/:componentId/obsolescence
   ```

2. **Check Current Availability**
   ```bash
   GET /api/components/:componentId/availability?quantity=10000
   ```

3. **Identify Alternatives**
   - Review alternative components
   - Assess substitution risk
   - Check qualification status

4. **Execute Mitigation Plan**
   - Last-time buy (strategic inventory)
   - Qualify alternative components
   - Redesign products if necessary
   - Engage with manufacturer for extended support

## Best Practices

### 1. Network Mapping

- **Regular Updates**: Update network topology weekly or when significant changes occur
- **Multi-Tier Mapping**: Map at least 3 tiers deep for critical components
- **Relationship Strength**: Regularly update relationship strength scores based on transaction volumes
- **Critical Node Identification**: Mark critical suppliers and regularly review their status

### 2. Risk Assessment

- **Assessment Frequency**:
  - Critical suppliers: Monthly
  - High-value suppliers: Quarterly
  - Standard suppliers: Annually
- **Comprehensive Assessment**: Include all risk categories (financial, cyber, ESG, geopolitical)
- **Threshold Setting**: Define clear risk thresholds and escalation procedures
- **Mitigation Tracking**: Track mitigation actions through to completion

### 3. Compliance

- **Automated Screening**: Screen all new suppliers and regularly re-screen existing ones
- **Documentation**: Maintain comprehensive compliance documentation
- **Certification Tracking**: Monitor certification expiration dates proactively
- **Regulatory Monitoring**: Subscribe to regulatory change notifications for relevant jurisdictions

### 4. Component Tracking

- **Inventory Optimization**: Use availability analysis to optimize reorder points
- **Price Monitoring**: Track price volatility for cost forecasting
- **Obsolescence Planning**: Review obsolescence risk quarterly for critical components
- **Counterfeit Prevention**: Implement serialization and authentication for high-value components

### 5. Incident Management

- **Rapid Detection**: Implement real-time monitoring and alerting
- **Clear Escalation**: Define incident severity levels and escalation paths
- **Root Cause Analysis**: Conduct thorough post-incident reviews
- **Continuous Improvement**: Implement preventive measures based on lessons learned

## Troubleshooting

### Common Issues

#### Issue: "Node not found" Error

**Cause**: Node ID doesn't exist in the database

**Solution**:
```bash
# Verify node exists
GET /api/nodes/:id

# If not found, create the node first
POST /api/nodes
{
  "type": "supplier",
  "name": "Supplier Name",
  "tier": 1,
  "status": "active",
  "criticality": "high"
}
```

#### Issue: Slow Topology Analysis

**Cause**: Large network (>10,000 nodes)

**Solution**:
- Use pagination for node retrieval
- Implement caching with Redis
- Use Neo4j for graph queries (faster than in-memory)
- Consider subgraph analysis for specific regions

#### Issue: High Memory Usage

**Cause**: Loading entire network into memory

**Solution**:
- Implement database persistence
- Use streaming for large datasets
- Implement pagination on API endpoints
- Add memory limits to services

#### Issue: Inaccurate Risk Scores

**Cause**: Missing or outdated assessment data

**Solution**:
- Ensure all required metrics are provided
- Set up regular assessment schedules
- Implement data validation
- Review scoring weight configurations

## Support and Resources

- **API Documentation**: https://docs.intelgraph.com/supply-chain/api
- **GitHub Repository**: https://github.com/intelgraph/supply-chain-intelligence
- **Support**: support@intelgraph.com
- **Community Forum**: https://community.intelgraph.com

## Appendix

### Sample Data Structures

#### Supply Chain Node

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "supplier",
  "name": "ACME Components Inc.",
  "description": "Electronic component manufacturer",
  "location": {
    "country": "China",
    "region": "Guangdong",
    "city": "Shenzhen",
    "latitude": 22.5431,
    "longitude": 114.0579
  },
  "tier": 1,
  "status": "active",
  "criticality": "high",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### Risk Assessment

```json
{
  "id": "assessment-123",
  "nodeId": "550e8400-e29b-41d4-a716-446655440000",
  "category": "financial",
  "level": "medium",
  "score": 65,
  "indicators": [
    {
      "name": "Credit Rating",
      "value": "BBB",
      "impact": "neutral"
    },
    {
      "name": "Debt to Equity",
      "value": 1.2,
      "impact": "negative"
    }
  ],
  "mitigations": [
    "Quarterly financial reviews",
    "Request updated financial statements"
  ],
  "assessedAt": "2024-01-15T10:00:00Z"
}
```

### Glossary

- **BOM**: Bill of Materials
- **DRC**: Democratic Republic of Congo
- **ESG**: Environmental, Social, and Governance
- **HHI**: Herfindahl-Hirschman Index (market concentration measure)
- **OFAC**: Office of Foreign Assets Control
- **SLA**: Service Level Agreement
- **SPOF**: Single Point of Failure
- **Tier 1**: Direct suppliers
- **Tier 2+**: Sub-suppliers (suppliers to your suppliers)
