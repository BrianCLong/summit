# @intelgraph/ai-wellbeing-predictors

AI-driven prediction tools for proactive citizen wellbeing forecasting and early interventions.

## Overview

This package integrates health, economic, educational, and behavioral data to:
- Forecast citizen needs and identify at-risk populations
- Generate early intervention recommendations
- Optimize resource allocation for maximum impact
- Enable continuous improvements in life quality

## Installation

```bash
pnpm add @intelgraph/ai-wellbeing-predictors
```

## Usage

```typescript
import {
  WellbeingPredictor,
  InterventionRecommender,
  ResourceAllocator,
  createWellbeingPipeline,
  CitizenWellbeingProfile,
} from '@intelgraph/ai-wellbeing-predictors';

// Create a prediction pipeline
const { predictor, recommender, allocator } = createWellbeingPipeline();

// Or instantiate individually
const predictor = new WellbeingPredictor();
const recommender = new InterventionRecommender();
const allocator = new ResourceAllocator();

// Generate prediction for a citizen
const profile: CitizenWellbeingProfile = {
  citizenId: 'citizen-123',
  lastUpdated: new Date().toISOString(),
  healthData: { /* ... */ },
  economicData: { /* ... */ },
  educationalData: { /* ... */ },
  behavioralData: { /* ... */ },
  predictions: [],
  activeInterventions: [],
  historicalScores: [],
};

const prediction = predictor.predict(profile);
console.log(prediction.overallWellbeingScore); // 0-100
console.log(prediction.riskLevel); // 'critical' | 'high' | 'moderate' | 'low' | 'minimal'

// Get intervention recommendations
const interventions = recommender.recommend(prediction);

// Optimize resource allocation for a region
const allocation = allocator.allocate(predictions, 1000000, 'region-1');
```

## Core Components

### WellbeingPredictor
Multi-domain scoring engine with configurable weights across 8 wellbeing domains:
- Health, Economic, Educational, Social
- Housing, Mental Health, Food Security, Employment

### InterventionRecommender
Generates prioritized intervention recommendations based on:
- Risk levels and domain deficits
- Available programs and resources
- Estimated impact and cost

### ResourceAllocator
Optimizes budget allocation and provides:
- Regional resource optimization
- Cohort analysis
- Impact projections

## API Reference

See [types.ts](./src/types.ts) for complete type definitions.
