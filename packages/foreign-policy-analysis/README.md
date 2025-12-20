# Foreign Policy Analysis

Comprehensive analysis of foreign policy positions, strategic doctrines, policy evolution, and international alignments.

## Features

- **Policy Tracking**: Monitor foreign policy positions across all domains
- **Shift Detection**: Identify and analyze policy shifts and reversals
- **Voting Analysis**: Analyze voting patterns in international forums
- **Alignment Calculation**: Calculate policy alignment between countries
- **Doctrine Analysis**: Track strategic doctrines and consistency
- **Prediction**: Forecast policy evolution and trends

## Usage

```typescript
import { ForeignPolicyAnalyzer, PolicyDomain } from '@intelgraph/foreign-policy-analysis';

const analyzer = new ForeignPolicyAnalyzer();

// Track policy
analyzer.trackPolicy({
  id: 'policy-001',
  country: 'USA',
  domain: PolicyDomain.SECURITY,
  topic: 'Nuclear deterrence',
  position: PolicyPosition.STRONGLY_SUPPORT,
  // ... other details
});

// Detect policy shifts
const shifts = analyzer.detectPolicyShifts('USA', 365);

// Calculate alignment
const alignment = analyzer.calculatePolicyAlignment('USA', 'UK');

// Compare policies
const comparison = analyzer.comparePolicies(
  ['USA', 'China', 'Russia'],
  PolicyDomain.SECURITY,
  'Cyber warfare'
);

// Predict evolution
const prediction = analyzer.predictPolicyEvolution('USA', PolicyDomain.TRADE);
```
