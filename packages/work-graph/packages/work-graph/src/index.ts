/**
 * Summit Work Graph
 *
 * A graph-native engineering management system where Linear/Jira tickets
 * are "thin projections" over a richer decision graph.
 *
 * Features:
 * - Graph-based work modeling (nodes + edges)
 * - Neo4j and in-memory storage backends
 * - Real-time event system with webhooks
 * - B2A (Business-to-Agent) work market
 * - Policy-compiled governance
 * - Monte Carlo portfolio simulation
 * - Linear/Jira bidirectional sync
 * - GitHub/Slack integrations
 * - AI-powered auto-triage
 * - Engineering metrics dashboard
 * - GraphQL API
 */

// Schema
export * from './schema/index.js';

// Storage
export * from './store/index.js';

// Events
export * from './events/index.js';

// Planner
export * from './planner/index.js';

// Agents/Market
export * from './agents/index.js';

// Policy
export * from './policy/index.js';

// Portfolio
export * from './portfolio/index.js';

// Projections
export * from './projections/index.js';

// Metrics
export * from './metrics/index.js';

// Integrations
export * from './integrations/index.js';

// Triage
export * from './triage/index.js';

// API
export * from './api/index.js';
