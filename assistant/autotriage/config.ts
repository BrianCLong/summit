/**
 * Autotriage Engine Configuration
 *
 * Defines rules, thresholds, and keywords for automatic issue classification
 */

export interface TriageConfig {
  areas: AreaConfig[];
  impactRules: ImpactRule[];
  typeRules: TypeRule[];
  clustering: ClusteringConfig;
  reporting: ReportingConfig;
}

export interface AreaConfig {
  name: string;
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

export interface ImpactRule {
  level: 'blocker' | 'high' | 'medium' | 'low';
  keywords: string[];
  patterns: RegExp[];
  score: number;
}

export interface TypeRule {
  type: 'bug' | 'tech-debt' | 'feature' | 'enhancement';
  keywords: string[];
  patterns: RegExp[];
}

export interface ClusteringConfig {
  similarityThreshold: number;
  minClusterSize: number;
  maxClusters: number;
}

export interface ReportingConfig {
  topIssuesCount: number;
  topThemesCount: number;
  goodFirstIssueThreshold: number;
}

export const defaultConfig: TriageConfig = {
  areas: [
    {
      name: 'copilot',
      keywords: ['copilot', 'ai assistant', 'llm', 'mcp', 'tool', 'agent', 'prompt'],
      patterns: [/copilot/i, /mcp/i, /assistant/i, /ai.?model/i],
      weight: 1.0,
    },
    {
      name: 'ingestion',
      keywords: ['ingestion', 'import', 'crawler', 'parser', 'etl', 'data loader', 'feed'],
      patterns: [/ingest/i, /import/i, /crawl/i, /parse/i, /loader/i],
      weight: 1.0,
    },
    {
      name: 'graph',
      keywords: ['graph', 'neo4j', 'relationship', 'entity', 'cypher', 'node', 'edge'],
      patterns: [/graph/i, /neo4j/i, /relationship/i, /entity/i, /cypher/i],
      weight: 1.0,
    },
    {
      name: 'ui',
      keywords: ['ui', 'frontend', 'react', 'component', 'interface', 'ux', 'design', 'css'],
      patterns: [/\bui\b/i, /frontend/i, /react/i, /component/i, /interface/i],
      weight: 1.0,
    },
    {
      name: 'infra',
      keywords: ['infrastructure', 'deployment', 'docker', 'k8s', 'ci/cd', 'devops', 'monitoring'],
      patterns: [/infra/i, /deploy/i, /docker/i, /kubernetes/i, /k8s/i, /ci.?cd/i],
      weight: 1.0,
    },
    {
      name: 'api',
      keywords: ['api', 'graphql', 'rest', 'endpoint', 'service', 'backend'],
      patterns: [/\bapi\b/i, /graphql/i, /endpoint/i, /backend/i],
      weight: 1.0,
    },
    {
      name: 'observability',
      keywords: ['observability', 'telemetry', 'metrics', 'traces', 'logs', 'monitoring', 'otel'],
      patterns: [/observability/i, /telemetry/i, /metrics/i, /traces/i, /otel/i],
      weight: 1.0,
    },
    {
      name: 'security',
      keywords: ['security', 'auth', 'authorization', 'permission', 'compliance', 'audit'],
      patterns: [/security/i, /auth/i, /permission/i, /compliance/i],
      weight: 1.0,
    },
  ],
  impactRules: [
    {
      level: 'blocker',
      keywords: ['crash', 'critical', 'blocker', 'p0', 'down', 'broken', 'cannot', 'blocks'],
      patterns: [/\bp0\b/i, /critical/i, /blocker/i, /crash/i, /production.?down/i],
      score: 100,
    },
    {
      level: 'high',
      keywords: ['high', 'p1', 'important', 'major', 'severe', 'urgent', 'degraded'],
      patterns: [/\bp1\b/i, /\bhigh\b/i, /major/i, /severe/i, /degraded/i],
      score: 75,
    },
    {
      level: 'medium',
      keywords: ['medium', 'p2', 'moderate', 'minor impact'],
      patterns: [/\bp2\b/i, /medium/i, /moderate/i],
      score: 50,
    },
    {
      level: 'low',
      keywords: ['low', 'p3', 'p4', 'nice to have', 'papercut', 'minor'],
      patterns: [/\bp3\b/i, /\bp4\b/i, /\blow\b/i, /papercut/i, /nice.?to.?have/i],
      score: 25,
    },
  ],
  typeRules: [
    {
      type: 'bug',
      keywords: ['bug', 'error', 'issue', 'broken', 'not working', 'fails', 'crash'],
      patterns: [/\bbug\b/i, /error/i, /broken/i, /crash/i, /fails/i],
    },
    {
      type: 'tech-debt',
      keywords: ['tech debt', 'refactor', 'cleanup', 'deprecate', 'legacy', 'technical debt'],
      patterns: [/tech.?debt/i, /refactor/i, /cleanup/i, /deprecate/i, /legacy/i],
    },
    {
      type: 'feature',
      keywords: ['feature', 'enhancement', 'implement', 'add', 'new'],
      patterns: [/feature/i, /implement/i, /\badd\b/i, /\bnew\b/i],
    },
    {
      type: 'enhancement',
      keywords: ['enhancement', 'improve', 'optimize', 'performance', 'better'],
      patterns: [/enhance/i, /improve/i, /optimize/i, /performance/i],
    },
  ],
  clustering: {
    similarityThreshold: 0.65,
    minClusterSize: 2,
    maxClusters: 20,
  },
  reporting: {
    topIssuesCount: 10,
    topThemesCount: 10,
    goodFirstIssueThreshold: 30, // Complexity score threshold
  },
};
