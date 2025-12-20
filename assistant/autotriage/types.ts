/**
 * Type definitions for autotriage engine
 */

export interface TriageItem {
  id: string;
  title: string;
  description: string;
  source: 'backlog' | 'bugbash' | 'github';
  sourceId: string;

  // Classified attributes
  area: string[];
  impact: 'blocker' | 'high' | 'medium' | 'low';
  type: 'bug' | 'tech-debt' | 'feature' | 'enhancement';

  // Metadata
  component?: string;
  owner?: string;
  status?: string;
  priority?: string;
  runbook?: string;
  environment?: string;

  // Clustering
  clusterId?: string;
  clusterTheme?: string;

  // Scores
  impactScore: number;
  complexityScore: number;

  // Good first issue detection
  isGoodFirstIssue: boolean;

  // Raw data
  raw: any;
}

export interface IssueCluster {
  id: string;
  theme: string;
  items: TriageItem[];
  area: string[];
  avgImpactScore: number;
  count: number;
}

export interface TriageReport {
  generatedAt: string;
  summary: {
    totalItems: number;
    bySource: Record<string, number>;
    byArea: Record<string, number>;
    byImpact: Record<string, number>;
    byType: Record<string, number>;
  };
  topBlockingThemes: IssueCluster[];
  topIssues: TriageItem[];
  goodFirstIssues: TriageItem[];
  clusters: IssueCluster[];
  recommendations: string[];
}
