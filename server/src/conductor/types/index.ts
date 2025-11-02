// Core types for the MoE Conductor system
// Defines the interfaces for routing, expert selection, and MCP communication

import type { MissionControlConflictContext } from '../mission-control/conflict-resolution';

export type ExpertType =
  | 'LLM_LIGHT'
  | 'LLM_HEAVY'
  | 'GRAPH_TOOL'
  | 'RAG_TOOL'
  | 'FILES_TOOL'
  | 'OSINT_TOOL'
  | 'EXPORT_TOOL';

export interface ConductInput {
  task: string;
  dataRefs?: string[];
  allowTools?: boolean;
  maxLatencyMs?: number;
  sensitivity?: 'low' | 'pii' | 'secret';
  userContext?: Record<string, any>;
  investigationId?: string;
  runId?: string;
  missionControlContext?: MissionControlConflictContext;
}

export interface ConductResult {
  expertId: ExpertType;
  output: any;
  logs: string[];
  cost: number;
  latencyMs: number;
  error?: string;
  auditId?: string;
}

export interface RouteDecision {
  expert: ExpertType;
  reason: string;
  confidence: number;
  features: Record<string, any>;
  alternatives: ExpertType[];
}

export interface ExpertCapabilities {
  type: ExpertType;
  costPerToken?: number;
  avgLatencyMs?: number;
  maxTokens?: number;
  supportedModalities: string[];
  securityLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface RoutingFeatures {
  taskLength: number;
  hasGraphKeywords: boolean;
  hasFileKeywords: boolean;
  hasOSINTKeywords: boolean;
  hasExportKeywords: boolean;
  complexityScore: number;
  sensitivityLevel: string;
  maxLatencyMs: number;
  userRole?: string;
  investigationContext?: boolean;
}

// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  scopes?: string[];
}

export interface MCPServerConfig {
  url: string;
  name: string;
  tools: MCPTool[];
  authToken?: string;
  scopes?: string[];
  rateLimits?: {
    requestsPerSecond: number;
    requestsPerHour: number;
  };
}

// Metrics and Observability
export interface ExpertMetrics {
  expertType: ExpertType;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  avgCost: number;
  lastUsed: Date;
}

export interface RoutingMetrics {
  totalRequests: number;
  routingDecisions: Record<ExpertType, number>;
  avgDecisionTime: number;
  confidenceDistribution: Record<string, number>;
}
