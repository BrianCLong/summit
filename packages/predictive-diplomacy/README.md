# Predictive Diplomacy and Forecasting

Advanced prediction and forecasting engine for diplomatic outcomes, relationship trajectories, policy shifts, and geopolitical developments.

## Features

- **Relationship Prediction**: Forecast bilateral relationship trajectories
- **Policy Shift Detection**: Predict policy changes and shifts
- **Negotiation Outcomes**: Forecast negotiation success probability
- **Regional Stability**: Assess and forecast regional stability
- **Trend Analysis**: Analyze and project diplomatic trends
- **Risk Assessment**: Identify and assess geopolitical risks
- **Opportunity Identification**: Detect diplomatic opportunities
- **Scenario Planning**: Generate multiple outcome scenarios

## Usage

```typescript
import { PredictiveDiplomacy, PredictionTimeframe } from '@intelgraph/predictive-diplomacy';

const predictor = new PredictiveDiplomacy();

// Predict relationship trajectory
const trajectory = predictor.predictRelationshipTrajectory(
  'USA',
  'China',
  60, // current quality
  'DETERIORATING',
  indicators
);

// Predict policy shift
const policyShift = predictor.predictPolicyShift(
  'USA',
  'Trade Policy',
  'Current Position',
  indicators
);

// Forecast regional stability
const stability = predictor.forecastRegionalStability(
  'Middle East',
  ['Iran', 'Saudi Arabia', 'Israel'],
  45, // current stability
  flashpoints
);

// Generate comprehensive forecast
const forecast = predictor.generateForecast(
  'REGIONAL',
  'Asia-Pacific Security',
  PredictionTimeframe.MEDIUM_TERM
);

// Verify prediction
const accuracy = predictor.verifyPrediction(
  'pred-123',
  'Actual outcome description'
);
```

## Prediction Types

- Relationship trajectories
- Policy shifts
- Alliance changes
- Negotiation outcomes
- Treaty ratification likelihood
- Diplomatic incidents
- Crisis escalation
- Leadership transition impacts
- Regional stability
- Multilateral initiative success

## Confidence Levels

- **Very High** (90-100%): Strong indicators, clear patterns
- **High** (75-90%): Good indicators, reliable data
- **Medium** (50-75%): Mixed signals, moderate certainty
- **Low** (25-50%): Weak indicators, high uncertainty
- **Very Low** (0-25%): Speculative, very uncertain
