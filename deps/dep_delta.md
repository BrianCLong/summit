# Dependency Delta - Core Standardization & Bug Fixes

## Changes
- Standardized React ecosystem to v18.
- Downgraded ESLint to v8.57.0.
- Aligned OpenTelemetry API to v1.7.0.
- Unified Storybook to v8.6.14.
- Pinned Vite to v5.4.21.
- Updated `zod` to ^3.23.8 in `services/graphrag`.
- Updated `typescript` to 5.8.3 in `services/agentic-mesh-evaluation`.

## Justification
- **React**: Resolve peer mismatches and ensure ecosystem stability.
- **ESLint**: Maintain compatibility with existing plugins.
- **OTel/Storybook**: Eliminate Skew and peer warnings.
- **Vite**: Support `vite-plugin-pwa`.
- **Zod/TS**: Satisfy specific version requirements of `openai` and `typedoc`.
- **Bug Fix**: Addressed `MaxListenersExceededWarning` in `ThreatHuntingOrchestrator`.
