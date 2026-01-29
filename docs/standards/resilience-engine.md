# Resilience Engine Standard

## Overview
The Resilience Engine is a comprehensive framework for handling runtime failures in the Summit platform. It subsumes ad-hoc error handling into a governed, policy-driven system.

## Core Components

### 1. Granular Error Boundaries
Critical application surfaces are wrapped in `DataFetchErrorBoundary` (for data-dependent views) or `ErrorBoundary` (for generic UI).
- **Enforcement**: `scripts/project19-enforcement.ts` ensures coverage for key routes.

### 2. Resilience Policy Engine
A dynamic configuration layer (`ResilienceContext`) that dictates recovery behavior.
- **Policies**:
    - `maxRetries`: Number of allowed auto-retries.
    - `fallbackStrategy`: `simple` (retry button) vs `agentic` (AI diagnosis).
    - `reportErrors`: Boolean toggle for telemetry.

### 3. Evidence-Based Error Reporting
All client-side errors are formatted as **Evidence Contracts** (`EvidenceContract`) and emitted to the observability pipeline.
- **Schema**:
    - `manifest.strategy`: `CLIENT_ERROR`
    - `citations`: Empty (reserved for RAG)
    - `parameters`: Stack trace, component stack, metadata.

### 4. Agentic Recovery
The system leverages the "Ask Copilot" pattern to diagnose complex failures that simple retries cannot fix.
- **Workflow**: Crash -> Evidence Emission -> Copilot Analysis -> User Guidance.

## Usage
Wrap your component tree in `ResilienceProvider`:
```tsx
<ResilienceProvider>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</ResilienceProvider>
```

## Governance
- **Owner**: Jules (Release Captain)
- **Claim ID**: PROJECT-19
- **Compliance**: ECS v1.0.0
