// Maestro Conductor v0.4 - "Align & Automate" — Autonomous Release Train
// Sprint Goal: Scale from fast CI and first‑gen agents to a risk‑aware, cost‑optimized,
// self‑healing automation that merges safe PRs and ships on a schedule with high confidence.

export { MaestroConductorV4 } from './conductor';
export { RiskScorer } from './risk/scorer';
export { CapabilityRouter } from './routing/capability-router';
export { CriticAgent } from './agents/critic';
export { FixerAgent } from './agents/fixer';
export { PolicyEngine } from './policy/engine';
export { BuildGraph } from './build/graph';
export { TestSharding } from './testing/sharding';
export { Provenance } from './security/provenance';
export { DevEnvironment } from './devex/environment';

// Version info
export const VERSION = '0.4.0';
export const CODENAME = 'Align & Automate';
