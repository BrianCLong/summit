/**
 * Threat hunting types
 */

import { ThreatCategory, ThreatSeverity } from './events';

export enum HuntType {
  HYPOTHESIS_DRIVEN = 'HYPOTHESIS_DRIVEN',
  INDICATOR_BASED = 'INDICATOR_BASED',
  TTP_BASED = 'TTP_BASED',
  ANOMALY_BASED = 'ANOMALY_BASED',
  INTELLIGENCE_DRIVEN = 'INTELLIGENCE_DRIVEN'
}

export enum HuntStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface ThreatHunt {
  id: string;
  name: string;
  description: string;
  type: HuntType;

  // Hypothesis (for hypothesis-driven hunts)
  hypothesis?: string;

  // Target
  targetScope: {
    systems?: string[];
    users?: string[];
    networks?: string[];
    timeRange: {
      start: Date;
      end: Date;
    };
  };

  // Indicators (for indicator-based hunts)
  indicators?: {
    type: string;
    value: string;
    confidence: number;
  }[];

  // TTPs (for TTP-based hunts)
  ttps?: {
    tactic: string;
    technique: string;
    detectionLogic: any;
  }[];

  // Status
  status: HuntStatus;
  startedAt?: Date;
  completedAt?: Date;

  // Team
  hunters: string[];
  leadHunter: string;

  // Findings
  findings: HuntFinding[];

  // Queries and searches
  queries: HuntQuery[];

  // Results
  totalEventsAnalyzed: number;
  suspiciousEventsFound: number;
  threatsConfirmed: number;

  // Metrics
  metrics: {
    timeSpent: number; // milliseconds
    dataProcessed: number; // bytes
    systemsAnalyzed: number;
    alertsGenerated: number;
  };

  // Documentation
  notes: string;
  report?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Collaboration
  collaborators?: string[];
  sharedWith?: string[];
}

export interface HuntFinding {
  id: string;
  huntId: string;

  // Finding details
  title: string;
  description: string;
  severity: ThreatSeverity;
  category: ThreatCategory;

  // Evidence
  evidence: {
    type: 'event' | 'log' | 'file' | 'network_traffic' | 'screenshot' | 'other';
    description: string;
    reference: string; // ID or path
    timestamp: Date;
  }[];

  // Context
  affectedEntities: string[];
  timeline: {
    timestamp: Date;
    event: string;
    significance: string;
  }[];

  // Analysis
  analysisNotes: string;
  confidence: number;

  // Response
  recommendedActions: string[];
  actionsPerformed?: {
    action: string;
    performedBy: string;
    timestamp: Date;
    result: string;
  }[];

  // Status
  validated: boolean;
  falsePositive: boolean;

  // Alert generation
  alertGenerated: boolean;
  alertId?: string;

  timestamp: Date;
  discoveredBy: string;
}

export interface HuntQuery {
  id: string;
  huntId: string;

  // Query details
  name: string;
  description: string;
  queryType: 'sql' | 'kql' | 'spl' | 'lucene' | 'regex' | 'graph' | 'custom';
  query: string;

  // Target
  dataSource: string;
  timeRange: {
    start: Date;
    end: Date;
  };

  // Execution
  executed: boolean;
  executedAt?: Date;
  executedBy?: string;
  executionTime?: number; // milliseconds

  // Results
  resultsCount?: number;
  suspiciousResults?: number;
  results?: any[];

  // Analysis
  findings?: string[]; // Finding IDs
  notes?: string;

  createdAt: Date;
}

export interface HuntPlaybook {
  id: string;
  name: string;
  description: string;
  type: HuntType;

  // Target
  targetThreats: ThreatCategory[];
  targetTtps?: string[];

  // Steps
  steps: {
    order: number;
    name: string;
    description: string;
    type: 'query' | 'analysis' | 'correlation' | 'validation' | 'documentation';

    // Query templates
    queryTemplates?: {
      name: string;
      dataSource: string;
      queryType: string;
      query: string;
      variables?: Record<string, string>;
    }[];

    // Guidance
    guidance: string;
    expectedOutcomes: string[];

    // Time estimate
    estimatedTime?: number; // minutes
  }[];

  // Prerequisites
  prerequisites?: {
    dataSources: string[];
    permissions: string[];
    tools: string[];
  };

  // Metrics
  usageCount: number;
  averageExecutionTime?: number; // milliseconds
  successRate?: number;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;

  // Tags
  tags: string[];
}

export interface HuntMetrics {
  period: {
    start: Date;
    end: Date;
  };

  // Hunt statistics
  totalHunts: number;
  activeHunts: number;
  completedHunts: number;

  // Findings
  totalFindings: number;
  confirmedThreats: number;
  falsePositives: number;

  // Efficiency
  averageHuntDuration: number; // milliseconds
  averageEventsAnalyzed: number;
  averageTimeToFinding: number; // milliseconds

  // Coverage
  systemsCovered: number;
  dataSourcesCovered: string[];

  // Hunters
  activeHunters: number;
  topHunters: {
    hunterId: string;
    huntsCompleted: number;
    threatsFound: number;
  }[];

  // Trends
  huntTrends: {
    date: Date;
    huntsStarted: number;
    huntsCompleted: number;
    threatsFound: number;
  }[];
}

export interface HuntingTool {
  id: string;
  name: string;
  type: 'query_builder' | 'log_analyzer' | 'network_analyzer' | 'memory_analyzer' | 'file_analyzer';

  // Integration
  endpoint?: string;
  apiKey?: string;

  // Capabilities
  supportedDataSources: string[];
  supportedQueryTypes: string[];

  // Configuration
  config: Record<string, any>;

  enabled: boolean;
}
