# Systemic Information Risk Register

## Overview

This package implements the **Systemic Information Risk Register (SIRR)**, a centralized ledger for tracking, scoring, and mitigating high-level information risks. It serves as the "Governance Brain" that connects detection signals to executive decision-making.

## Core Components

### 1. Risk Cascade Engine

Models how individual narrative threats combine to destabilize broader systems.

* **Input:** `ThreatSignal[]` (from Detectors)
* **Logic:** Calculates `CascadingRiskScore` based on graph centrality and semantic resonance with critical assets.
* **Output:** `RiskEvent` (High/Critical)

### 2. Risk Ledger

An immutable log of all risk assessments, serving as the "Source of Truth" for audits.

* **Storage:** Bitemporal database (Valid Time + Transaction Time).
* **Schema:** Defined in `@summit/schemas/governance`.

### 3. Policy Enforcer

Automates responses based on risk levels.

* **Low Risk:** Log & Monitor.
* **Medium Risk:** Notify Analyst.
* **High Risk:** Active Mitigation (Labeling/Throttling) + Executive Alert.
* **Critical Risk:** "Circuit Breaker" (Shutdown affected surfaces).

## Integration

Usage within the Summit Governance OS:

```typescript
import { SystemicRiskRegister } from '@summit/governance-systemic-risk';

const riskRegister = new SystemicRiskRegister();

// Ingest a threat signal
await riskRegister.ingestSignal({
  source: 'swarm-detector-v1',
  confidence: 0.95,
  target: 'brand-reputation'
});

// Query current risk state
const boardReport = await riskRegister.generateExecutiveBrief({
  timeframe: '7d'
});
```
