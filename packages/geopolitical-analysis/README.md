# @summit/geopolitical-analysis

Comprehensive geopolitical risk analysis, indicators, and scenario modeling for IntelGraph/Summit platform.

## Overview

This package provides legitimate analytical tools for geopolitical intelligence analysis, including:

- **Risk Indicators**: Political stability, economic stability, food security, supply chain vulnerability, and more
- **Scenario Modeling**: What-if analysis frameworks for strategic planning
- **Early Warning Systems**: Humanitarian crisis and conflict prevention monitoring
- **Ethical Safeguards**: Compliance checks to ensure responsible use

## Features

### 17 Indicator Types

1. **Political Stability** - Government effectiveness, elite cohesion, institutional strength
2. **Leadership Transition Risk** - Succession planning, continuity assessment
3. **Food Security** - Grain reserves, price inflation, agricultural production
4. **Supply Chain Vulnerability** - Resource dependencies, concentration risks
5. **Water Security** - Transboundary dependencies, conflict risks
6. **Alliance Stability** - Military and political cohesion tracking
7. **Economic Stability** - GDP, inflation, debt, currency stability
8. **Military Capability** - Force assessments, civil-military relations
9. **Sanctions Impact** - Economic effects, evasion capabilities
10. **Currency Sovereignty** - De-dollarization, payment system independence
11. **Humanitarian Crisis** - Early warning for displacement, violence
12. **Strategic Resource Dependency** - Critical minerals, energy
13. **Arctic Dynamics** - Territorial claims, resource competition
14. **Energy Security** - Import dependencies, transition dynamics
15. **Diaspora Influence** - Economic and political linkages
16. **Nuclear Capability** - Non-proliferation monitoring
17. **Power Transition** - Global power dynamics, hegemonic shifts

### 21 Analysis Prompts

Comprehensive prompts for AI-augmented analysis in `/prompts/geopolitical/`:

1. Political Stability Analysis
2. Leadership Transition Risk
3. Food Security Risk
4. Supply Chain Vulnerability
5. Water Security Assessment
6. Alliance Stability Tracking
7. Economic Stability Monitoring
8. Military Capability Assessment
9. Sanctions Impact Analysis
10. Currency Sovereignty Tracking
11. Humanitarian Crisis Early Warning
12. Strategic Resource Dependency
13. Arctic Territorial Dynamics
14. Energy Security Analysis
15. Diaspora Influence Tracking
16. Nuclear Capability Monitoring
17. Power Transition Tracking
18. Scenario Modeling Framework
19. Climate Security Nexus
20. Cyber Sovereignty Dynamics
21. Regional Integration Dynamics

## Installation

```bash
pnpm install @summit/geopolitical-analysis
```

## Usage

### Basic Indicator Calculation

```typescript
import {
  PoliticalStabilityCalculator,
  FoodSecurityCalculator,
  SupplyChainCalculator,
} from '@summit/geopolitical-analysis';

// Political stability assessment
const politicalCalc = new PoliticalStabilityCalculator();
const stability = politicalCalc.calculate({
  countryCode: 'NO',
  countryName: 'Norway',
  eliteCohesion: 90,
  governmentEffectiveness: 95,
  politicalViolenceRisk: 5,
  institutionalStrength: 95,
  protestActivity: 10,
  electionRisk: 5,
});

console.log(stability.riskLevel); // RiskLevel.LOW
console.log(stability.score); // 92.5

// Food security assessment
const foodCalc = new FoodSecurityCalculator();
const foodSecurity = foodCalc.calculate({
  countryCode: 'XX',
  countryName: 'Example Country',
  grainReservesDays: 45,
  foodPriceInflation: 12.5,
  importDependence: 60,
  agriculturalProduction: 85,
  supplyChainDisruption: 35,
});

console.log(foodSecurity.socialUnrestRisk); // 65

// Supply chain vulnerability
const supplyCalc = new SupplyChainCalculator();
const supplyChain = supplyCalc.calculate({
  countryCode: 'US',
  countryName: 'United States',
  resourceType: 'rare-earth-elements',
  supplyConcentration: 80,
  alternativeSourcesAvailable: 20,
  transportationRisk: 40,
  geopoliticalDependency: 75,
  stockpileDays: 30,
});

console.log(supplyChain.riskLevel); // RiskLevel.HIGH
```

### Compliance Checking

```typescript
import {
  checkAnalysisCompliance,
  checkIndicatorCompliance,
  validatePurpose,
} from '@summit/geopolitical-analysis';

// Check if analysis request is compliant
const complianceCheck = checkAnalysisCompliance(
  {
    countries: ['US', 'CN'],
    indicatorTypes: ['POLITICAL_STABILITY', 'ECONOMIC_STABILITY'],
  },
  'analyst@example.com',
  'Risk assessment for business continuity planning in Asian markets'
);

if (!complianceCheck.passed) {
  console.error('Compliance violations:', complianceCheck.violations);
  throw new Error('Analysis request violates ethical guidelines');
}

// Validate purpose statement
const purposeValidation = validatePurpose(
  'Early warning system for humanitarian crisis preparedness'
);

if (!purposeValidation.valid) {
  console.warn('Purpose concerns:', purposeValidation.concerns);
}

// Check indicator data compliance
const indicatorCheck = checkIndicatorCompliance(indicator);
if (!indicatorCheck.passed) {
  console.error('Indicator violations:', indicatorCheck.violations);
}
```

### Utility Functions

```typescript
import {
  scoreToRiskLevel,
  weightedAverage,
  normalize,
  calculateConfidence,
  detectTrend,
} from '@summit/geopolitical-analysis';

// Convert score to risk level
const risk = scoreToRiskLevel(85); // RiskLevel.CRITICAL

// Calculate weighted average
const avgScore = weightedAverage([
  { value: 80, weight: 0.6 },
  { value: 60, weight: 0.4 },
]); // 72

// Normalize values to 0-100 scale
const normalized = normalize(150, 100, 200, false); // 50

// Calculate confidence level
const confidence = calculateConfidence({
  dataRecency: 5,
  sourceReliability: 85,
  dataCompleteness: 90,
  expertConsensus: 80,
}); // ConfidenceLevel.HIGH

// Detect trend direction
const trend = detectTrend([10, 15, 20, 25, 30]); // 'RISING'
```

## Ethical Guidelines

This package is designed for **legitimate analytical purposes only**:

✅ **Permitted Uses:**
- Humanitarian early warning and crisis prevention
- Risk assessment for business and policy planning
- Scenario modeling for strategic planning
- Academic research and analysis
- Diplomatic strategy development
- Development program design

❌ **Prohibited Uses:**
- Planning or executing false flag operations
- Coup planning or regime change operations
- Election manipulation
- Destabilization campaigns
- Targeting individuals
- Surveillance of private citizens
- Deception operations

### Automated Safeguards

All analysis requests are automatically checked for:

1. **Prohibited Patterns**: Flags requests with concerning language
2. **Sensitive Indicators**: Requires justification for sensitive analyses
3. **Bulk Analysis**: Validates large-scale analyses
4. **Authentication**: Requires authenticated users
5. **PII Protection**: Prevents personally identifiable information in data
6. **Source Attribution**: Ensures proper data sourcing

### Compliance Logging

All compliance checks are logged for audit trails:

```typescript
import { logComplianceCheck } from '@summit/geopolitical-analysis';

logComplianceCheck({
  timestamp: new Date(),
  requestor: 'analyst@example.com',
  purpose: 'Humanitarian early warning',
  indicators: ['FOOD_SECURITY', 'HUMANITARIAN_CRISIS'],
  complianceResult: checkResult,
  actionTaken: 'APPROVED',
});
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Type Checking

```bash
pnpm typecheck
```

## Building

```bash
pnpm build
```

## Documentation

Comprehensive prompts and methodologies are available in `/prompts/geopolitical/`:

- Each prompt provides detailed analysis frameworks
- Ethical guidelines and constraints
- Data sources and validation approaches
- Risk assessment methodologies
- Scenario planning templates

## Integration with Summit/IntelGraph

This package integrates with:

- **Copilot Service**: AI-augmented analysis using geopolitical prompts
- **GraphQL API**: Query indicators and scenarios
- **Neo4j**: Graph-based relationship modeling
- **PostgreSQL**: Time-series indicator storage
- **Risk Scoring Package**: Composite risk calculations

## Contributing

When contributing:

1. Maintain ethical standards - all capabilities must be for legitimate analytical purposes
2. Add comprehensive tests for new calculators
3. Document methodologies clearly
4. Include safeguards for sensitive features
5. Follow TypeScript strict typing

## License

MIT License - See LICENSE file

## Security

Report security issues to: security@summit.example.com

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Questions: team@summit.example.com

---

**Remember**: This package is designed to support peace, stability, humanitarian protection, and legitimate analytical needs. Use responsibly.
