/**
 * Type definitions for autotriage engine
 */
export interface TriageItem {
    id: string;
    title: string;
    description: string;
    source: 'backlog' | 'bugbash' | 'github';
    sourceId: string;
    area: string[];
    impact: 'blocker' | 'high' | 'medium' | 'low';
    type: 'bug' | 'tech-debt' | 'feature' | 'enhancement';
    component?: string;
    owner?: string;
    status?: string;
    priority?: string;
    runbook?: string;
    environment?: string;
    clusterId?: string;
    clusterTheme?: string;
    impactScore: number;
    complexityScore: number;
    isGoodFirstIssue: boolean;
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
//# sourceMappingURL=types.d.ts.map