"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Schema
__exportStar(require("./schema/index.js"), exports);
// Storage
__exportStar(require("./store/index.js"), exports);
// Events
__exportStar(require("./events/index.js"), exports);
// Planner
__exportStar(require("./planner/index.js"), exports);
// Agents/Market
__exportStar(require("./agents/index.js"), exports);
// Policy
__exportStar(require("./policy/index.js"), exports);
// Portfolio
__exportStar(require("./portfolio/index.js"), exports);
// Projections
__exportStar(require("./projections/index.js"), exports);
// Metrics
__exportStar(require("./metrics/index.js"), exports);
// Integrations
__exportStar(require("./integrations/index.js"), exports);
// Triage
__exportStar(require("./triage/index.js"), exports);
// API
__exportStar(require("./api/index.js"), exports);
