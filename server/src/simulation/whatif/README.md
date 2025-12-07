# CompanyOS Operational Simulation & What-If Engine

This module implements the core logic for running operational simulations ("What-If" scenarios) for CompanyOS.

## Overview

The What-If Engine allows operators to simulate the impact of changes (policies, configs, deployments) before applying them to production.

## Architecture

See [docs/architecture/SIMULATION_ENGINE.md](../../../../docs/architecture/SIMULATION_ENGINE.md) for the detailed architecture, data model, and workflows.

## Usage

```typescript
import { whatIfEngine } from './WhatIfEngine';
import { WhatIfScenarioType } from './types';

const scenario = await whatIfEngine.defineScenario(
  'Test Strict Policy',
  WhatIfScenarioType.POLICY_CHANGE,
  { policyChanges: { strictMode: true } }
);

const result = await whatIfEngine.runScenario(scenario.id);
console.log(result.riskAssessment);
```
