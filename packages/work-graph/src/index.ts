// Schema - core types
export * from './schema/index.js';

// Store - graph database abstraction (canonical GraphStore interface)
export { Neo4jGraphStore, InMemoryGraphStore, type GraphStore } from './store/index.js';

// Events - real-time event bus
export * from './events/index.js';

// Planner - orchestration
export { PlannerOrchestrator, type PlanSynthesisResult, type ReplanTrigger } from './planner/index.js';

// Agents - B2A work market
export { WorkMarket, type WorkContract, type WorkBid, type BidEvaluation } from './agents/index.js';

// Policy - governance engine
export { PolicyEngine, type PolicyCheckResult, type PolicyEvaluationResult, type WaiverRequest, type PolicyCondition, type PolicyAction } from './policy/index.js';

// Portfolio - simulation
export { PortfolioSimulator, type SimulationConfig, type SimulationResult, type PortfolioOutcome } from './portfolio/index.js';

// Projections - external tool sync
export { LinearProjection, JiraProjection, type LinearConfig, type JiraConfig, type SyncResult, type LinearIssue, type JiraIssue } from './projections/index.js';

// Metrics - engineering metrics
export * from './metrics/index.js';

// Integrations - GitHub, Slack
export * from './integrations/index.js';

// Triage - auto-classification
export * from './triage/index.js';

// API - GraphQL
export { createWorkGraphAPI } from './api/index.js';
