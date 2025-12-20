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
export declare const defaultConfig: TriageConfig;
//# sourceMappingURL=config.d.ts.map