# @intelgraph/country-risk

Comprehensive country risk assessment and scoring system for geopolitical intelligence. This package provides sophisticated tools for evaluating country risk across multiple dimensions, generating credit ratings, and forecasting future risk levels.

## Features

- **Multi-Dimensional Risk Assessment**: Evaluate countries across 8 risk categories:
  - Political Risk
  - Economic Risk
  - Security Risk
  - Regulatory Risk
  - Operational Risk
  - Social Risk
  - Environmental Risk
  - Technological Risk

- **Credit Rating System**: Industry-standard rating scale (AAA to D) with detailed scoring methodology

- **Risk Forecasting**: Predict future risk levels using:
  - Trend analysis
  - Momentum indicators
  - Seasonal patterns
  - External factors
  - Monte Carlo simulation

- **Scenario Analysis**: Generate multiple scenarios (base case, optimistic, pessimistic, stress)

- **Stress Testing**: Evaluate resilience under adverse conditions

- **Historical Tracking**: Monitor risk evolution over time with comprehensive history

- **Peer Comparison**: Benchmark countries against regional and global peers

## Installation

```bash
npm install @intelgraph/country-risk
```

## Quick Start

### Basic Risk Assessment

```typescript
import { RiskAssessor, RiskIndicators } from '@intelgraph/country-risk';

// Create risk assessor
const assessor = new RiskAssessor({
  categoryWeights: {
    POLITICAL: 0.20,
    ECONOMIC: 0.25,
    SECURITY: 0.15,
    REGULATORY: 0.12,
    OPERATIONAL: 0.10,
    SOCIAL: 0.08,
    ENVIRONMENTAL: 0.05,
    TECHNOLOGICAL: 0.05,
  },
});

// Define country risk indicators
const indicators: RiskIndicators = {
  political: {
    governmentStability: 75,
    institutionalStrength: 80,
    ruleOfLaw: 82,
    corruptionIndex: 65,
    // ... more indicators
  },
  economic: {
    gdpGrowth: 3.5,
    inflationRate: 2.1,
    publicDebtToGDP: 55,
    bankingSystemStrength: 78,
    // ... more indicators
  },
  security: {
    conflictIntensity: 15,
    terrorismThreat: 20,
    regionalStability: 70,
    // ... more indicators
  },
  // ... other categories
};

// Perform assessment
const riskProfile = await assessor.assessCountryRisk(
  'USA',
  'United States',
  indicators,
  {
    region: 'North America',
    analyst: 'John Doe',
  }
);

console.log(`Rating: ${riskProfile.overallRating}`);
console.log(`Score: ${riskProfile.overallScore}`);
console.log(`Risk Level: ${riskProfile.riskLevel}`);
console.log(`Outlook: ${riskProfile.outlook}`);
```

### Generate Comprehensive Report

```typescript
const report = await assessor.generateReport('USA');

console.log('Executive Summary:', report.executiveSummary);
console.log('Key Findings:', report.keyFindings);
console.log('Recommendations:', report.recommendations);
```

### Risk Forecasting

```typescript
import { RiskForecaster } from '@intelgraph/country-risk';

const scoring = new RiskScoring(categoryWeights, ratingThresholds);
const forecaster = new RiskForecaster(scoring, {
  shortTermHorizon: 90,
  mediumTermHorizon: 180,
  longTermHorizon: 365,
});

// Forecast risk 180 days ahead
const forecast = await forecaster.forecastRisk(
  riskProfile,
  180,
  {
    globalEconomicGrowth: 3.0,
    regionalStability: 75,
    geopoliticalTensions: 45,
  }
);

console.log(`Projected Rating: ${forecast.projectedRating}`);
console.log(`Projected Score: ${forecast.projectedScore}`);
console.log(`Confidence: ${forecast.confidence}`);
console.log(`Confidence Interval: ${forecast.confidenceInterval}`);
```

### Scenario Analysis

```typescript
const scenarios = await forecaster.generateScenarios(riskProfile, 180);

scenarios.forEach(scenario => {
  console.log(`\n${scenario.name} Scenario:`);
  console.log(`Probability: ${(scenario.probability * 100).toFixed(0)}%`);
  console.log(`Projected Rating: ${scenario.projectedRating}`);
  console.log(`Projected Score: ${scenario.projectedScore}`);
  console.log(`Triggers: ${scenario.triggers.join(', ')}`);
});
```

### Stress Testing

```typescript
const stressTest = await forecaster.stressTest(
  riskProfile,
  'Economic Crisis with Political Instability',
  'SEVERE'
);

console.log(`Baseline Score: ${stressTest.baselineScore}`);
console.log(`Stressed Score: ${stressTest.stressedScore}`);
console.log(`Score Delta: ${stressTest.scoreDelta}`);
console.log(`Rating Change: ${stressTest.ratingDelta} notches`);
console.log(`Resilience: ${stressTest.resilience}/100`);
console.log(`Recovery Time: ${stressTest.recoveryTime} days`);
```

### Monte Carlo Simulation

```typescript
const simulation = await forecaster.monteCarloSimulation(
  riskProfile,
  180,
  10000 // iterations
);

console.log(`Mean Score: ${simulation.mean}`);
console.log(`Median Score: ${simulation.median}`);
console.log(`Standard Deviation: ${simulation.stdDev}`);
console.log(`95th Percentile: ${simulation.percentiles[95]}`);
console.log(`5th Percentile: ${simulation.percentiles[5]}`);
```

## Risk Categories

### Political Risk

Evaluates government stability, institutional strength, rule of law, corruption, leadership dynamics, and international relations.

**Key Indicators:**
- Government stability
- Political violence
- Institutional strength
- Rule of law
- Corruption index
- Leadership stability
- Diplomatic standing

### Economic Risk

Assesses macroeconomic conditions, fiscal position, debt sustainability, monetary stability, and external vulnerabilities.

**Key Indicators:**
- GDP growth
- Inflation rate
- Public debt to GDP
- External debt
- Banking system strength
- Foreign reserves
- Current account balance

### Security Risk

Analyzes conflict risk, terrorism threat, civil unrest, crime rates, and regional security dynamics.

**Key Indicators:**
- Conflict intensity
- Terrorism threat
- Civil unrest
- Crime rates
- Regional stability
- Border security

### Regulatory Risk

Evaluates legal framework, business environment, compliance requirements, and market access.

**Key Indicators:**
- Legal system strength
- Contract enforcement
- Property rights
- Ease of doing business
- Regulatory quality
- Trade barriers

### Operational Risk

Assesses infrastructure quality, human capital, supply chain resilience, and business continuity.

**Key Indicators:**
- Infrastructure quality
- Labor force quality
- Logistics performance
- Energy reliability
- Supply chain resilience

### Social Risk

Examines demographic trends, human development, social cohesion, and quality of services.

**Key Indicators:**
- Human development index
- Poverty rate
- Social cohesion
- Healthcare quality
- Education quality

### Environmental Risk

Analyzes climate vulnerability, natural disaster risk, environmental quality, and resource security.

**Key Indicators:**
- Climate change vulnerability
- Natural disaster frequency
- Environmental regulation
- Water stress
- Energy security

### Technological Risk

Evaluates digital infrastructure, innovation capacity, and cyber security.

**Key Indicators:**
- Digital infrastructure
- Innovation capacity
- Technology adoption
- Cyber security maturity

## Credit Rating Scale

The package uses an industry-standard rating scale:

### Investment Grade
- **AAA**: Extremely strong capacity to meet financial commitments
- **AA+, AA, AA-**: Very strong capacity
- **A+, A, A-**: Strong capacity
- **BBB+, BBB, BBB-**: Adequate capacity

### Speculative Grade (High Yield)
- **BB+, BB, BB-**: Less vulnerable but faces major uncertainties
- **B+, B, B-**: More vulnerable but currently has capacity
- **CCC+, CCC, CCC-**: Currently vulnerable and dependent on favorable conditions
- **CC**: Highly vulnerable; default expected
- **C**: Highly vulnerable; default imminent
- **D**: In default or bankruptcy

## Scoring Methodology

### Overall Score Calculation

The overall risk score is calculated as a weighted average of category scores:

```
Overall Score = Σ (Category Score × Category Weight)
```

Default weights:
- Political: 20%
- Economic: 25%
- Security: 15%
- Regulatory: 12%
- Operational: 10%
- Social: 8%
- Environmental: 5%
- Technological: 5%

### Score to Rating Conversion

Scores are converted to ratings using configurable thresholds:

| Score Range | Rating |
|-------------|--------|
| 95-100 | AAA |
| 85-95 | AA range |
| 75-85 | A range |
| 65-75 | BBB range |
| 55-65 | BB range |
| 45-55 | B range |
| 35-45 | CCC range |
| 25-35 | CC |
| 15-25 | C |
| 0-15 | D |

### Risk Level Classification

| Score Range | Risk Level |
|-------------|------------|
| 85-100 | Very Low |
| 70-85 | Low |
| 55-70 | Moderate |
| 40-55 | High |
| 25-40 | Very High |
| 0-25 | Extreme |

## Forecasting Methodology

### Forecast Model

The forecasting model combines multiple factors:

1. **Trend Analysis**: Linear regression on historical scores
2. **Momentum**: Recent rate of change
3. **Seasonality**: Periodic patterns (if detected)
4. **External Factors**: Global and regional conditions

Forecast formula:
```
Projected Score = Current Score +
                  (Trend × Time × Trend Weight) +
                  (Momentum × Time × Momentum Weight) +
                  (External Impact × External Weight)
```

### Confidence Intervals

Confidence intervals are calculated using historical volatility:

```
Margin = Z-Score × StdDev × √(Horizon/30)
Lower = Projected Score - Margin
Upper = Projected Score + Margin
```

### Monte Carlo Simulation

Monte Carlo simulation performs thousands of iterations with randomized external factors to generate a distribution of possible outcomes.

Benefits:
- Captures uncertainty
- Provides percentile ranges
- Identifies tail risks

## Advanced Features

### Historical Tracking

Track risk evolution over time:

```typescript
const history = assessor.getAssessmentHistory('USA');
const changes = assessor.getRiskChanges('USA');
```

### Custom Weighting

Override default category weights:

```typescript
const customAssessor = new RiskAssessor({
  categoryWeights: {
    POLITICAL: 0.30,  // Higher weight on political risk
    ECONOMIC: 0.30,   // Higher weight on economic risk
    SECURITY: 0.20,
    REGULATORY: 0.05,
    OPERATIONAL: 0.05,
    SOCIAL: 0.05,
    ENVIRONMENTAL: 0.03,
    TECHNOLOGICAL: 0.02,
  },
});
```

### Default Probability

Calculate probability of default based on rating:

```typescript
import { RiskScoring, CreditRating } from '@intelgraph/country-risk';

const scoring = new RiskScoring(weights, thresholds);
const defaultProb = scoring.calculateDefaultProbability(
  CreditRating.BBB,
  5  // years
);

console.log(`5-year default probability: ${(defaultProb * 100).toFixed(2)}%`);
```

### Expected Loss

Calculate expected loss given rating and exposure:

```typescript
const expectedLoss = scoring.calculateExpectedLoss(
  CreditRating.BB,
  1000000,  // exposure
  0.4,      // recovery rate
  1         // years
);

console.log(`Expected loss: $${expectedLoss.toFixed(2)}`);
```

## API Reference

### RiskAssessor

Main class for country risk assessment.

#### Constructor

```typescript
constructor(config?: Partial<AssessmentConfig>)
```

#### Methods

- `assessCountryRisk(countryCode, countryName, indicators, options)`: Perform comprehensive risk assessment
- `generateReport(countryCode)`: Generate detailed assessment report
- `getAssessmentHistory(countryCode)`: Get historical assessments
- `getRiskChanges(countryCode)`: Get risk change events

### RiskScoring

Scoring and rating engine.

#### Constructor

```typescript
constructor(categoryWeights, ratingThresholds)
```

#### Methods

- `calculateOverallScore(categoryScores)`: Calculate weighted overall score
- `scoreToRating(score)`: Convert score to credit rating
- `ratingToScore(rating)`: Convert rating to score
- `scoreToRiskLevel(score)`: Convert score to risk level
- `isInvestmentGrade(rating)`: Check if rating is investment grade
- `calculateNotchDifference(rating1, rating2)`: Calculate rating difference
- `calculateDefaultProbability(rating, years)`: Calculate default probability
- `calculateExpectedLoss(rating, exposure, recoveryRate, years)`: Calculate expected loss

### RiskForecaster

Forecasting and scenario analysis engine.

#### Constructor

```typescript
constructor(scoring, config?)
```

#### Methods

- `forecastRisk(profile, horizon, externalFactors?)`: Generate risk forecast
- `generateScenarios(profile, horizon)`: Generate scenario analysis
- `stressTest(profile, scenario, severity)`: Perform stress test
- `monteCarloSimulation(profile, horizon, iterations?)`: Run Monte Carlo simulation

## Types

All TypeScript types are fully documented. Key types include:

- `CountryRiskProfile`: Comprehensive risk profile
- `RiskIndicators`: Risk indicators for all categories
- `CategoryRiskScores`: Scores by category
- `ForecastResult`: Forecast output
- `ScenarioAnalysis`: Scenario analysis result
- `StressTestResult`: Stress test result
- `RiskAssessmentReport`: Comprehensive report

## Best Practices

1. **Data Quality**: Ensure high-quality input data for accurate assessments
2. **Regular Updates**: Update assessments regularly (quarterly recommended)
3. **Multiple Sources**: Use multiple data sources for validation
4. **Peer Comparison**: Always compare against peers for context
5. **Scenario Analysis**: Run multiple scenarios to understand risk range
6. **Stress Testing**: Regularly stress test to identify vulnerabilities
7. **Documentation**: Document assumptions and methodology

## Examples

See the `/examples` directory for complete examples:

- `basic-assessment.ts`: Basic risk assessment
- `forecasting.ts`: Risk forecasting and scenario analysis
- `stress-testing.ts`: Stress testing and resilience analysis
- `peer-comparison.ts`: Peer benchmarking
- `monte-carlo.ts`: Monte Carlo simulation

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT

## Support

For support, please contact the IntelGraph Team.

## Version History

### 1.0.0 (2025-11-20)
- Initial release
- Multi-dimensional risk assessment
- Credit rating system
- Forecasting and scenario analysis
- Stress testing
- Monte Carlo simulation
- Comprehensive documentation
