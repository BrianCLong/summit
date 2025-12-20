# @intelgraph/supplier-risk

Comprehensive supplier risk assessment and monitoring capabilities.

## Features

- **Financial Health Assessment**: Credit ratings, profitability, debt analysis
- **Cybersecurity Assessment**: Security posture, vulnerabilities, certifications
- **ESG Scoring**: Environmental, social, and governance risk evaluation
- **Geopolitical Risk**: Country-based risk assessment and sanctions screening
- **Operational Risk**: Status, criticality, and tier-based risk analysis
- **Risk Aggregation**: Weighted overall risk scoring across categories

## Installation

```bash
pnpm add @intelgraph/supplier-risk
```

## Usage

```typescript
import { SupplierRiskAssessor } from '@intelgraph/supplier-risk';
import {
  SupplyChainNode,
  FinancialHealthMetrics,
  CybersecurityPosture,
  ESGScore,
} from '@intelgraph/supply-chain-types';

const assessor = new SupplierRiskAssessor();

// Perform comprehensive risk assessment
const assessment = await assessor.assessSupplier(
  node,
  financialMetrics,
  cyberPosture,
  esgScore
);

console.log(`Overall Risk Score: ${assessment.overallRiskScore}/100`);
console.log(`Risk Level: ${assessment.overallRiskLevel}`);
console.log(`Category Risks: ${assessment.categoryRisks.length}`);

// Review recommendations
assessment.recommendations.forEach(rec => {
  console.log(`- ${rec}`);
});

// Review mitigation priorities
assessment.mitigationPriorities.forEach(({ category, priority, action }) => {
  console.log(`[${priority}] ${category}: ${action}`);
});
```

### Individual Risk Assessments

```typescript
// Assess only financial health
const financialRisk = assessor.assessFinancialHealth(nodeId, financialMetrics);
console.log(`Financial Risk Score: ${financialRisk.score}/100`);

// Assess cybersecurity posture
const cyberRisk = assessor.assessCybersecurity(nodeId, cyberPosture);
console.log(`Cybersecurity Risk Score: ${cyberRisk.score}/100`);

// Assess ESG
const esgRisk = assessor.assessESG(nodeId, esgScore);
console.log(`ESG Risk Score: ${esgRisk.score}/100`);

// Assess geopolitical risk
const geoRisk = assessor.assessGeopoliticalRisk(nodeId, 'China');
console.log(`Geopolitical Risk Level: ${geoRisk.level}`);
```

## Risk Categories

- **Financial**: Revenue, profitability, debt, credit ratings, bankruptcy risk
- **Cybersecurity**: Security score, vulnerabilities, certifications, incidents
- **ESG**: Environmental, social, governance scores and violations
- **Geopolitical**: Country risk, sanctions, political stability
- **Operational**: Status, criticality, tier position

## Risk Levels

- **Low** (80-100): Minimal risk, standard monitoring
- **Medium** (60-79): Moderate risk, enhanced monitoring
- **High** (40-59): Significant risk, mitigation required
- **Critical** (0-39): Severe risk, immediate action required

## API

### SupplierRiskAssessor

- `assessSupplier(node, financial?, cyber?, esg?)`: Comprehensive risk assessment
- `assessFinancialHealth(nodeId, metrics)`: Financial risk assessment
- `assessCybersecurity(nodeId, posture)`: Cybersecurity risk assessment
- `assessESG(nodeId, score)`: ESG risk assessment
- `assessGeopoliticalRisk(nodeId, country)`: Geopolitical risk assessment
- `assessOperationalRisk(node)`: Operational risk assessment

## License

Proprietary - IntelGraph
