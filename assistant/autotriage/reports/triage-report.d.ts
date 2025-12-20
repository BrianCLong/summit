/**
 * Triage report generator
 * Generates comprehensive triage reports with prioritization
 */
import { TriageItem, IssueCluster, TriageReport } from '../types.js';
export declare function generateTriageReport(items: TriageItem[], clusters: IssueCluster[], topIssuesCount?: number, topThemesCount?: number): TriageReport;
/**
 * Format report as markdown
 */
export declare function formatReportAsMarkdown(report: TriageReport): string;
/**
 * Format report as JSON
 */
export declare function formatReportAsJSON(report: TriageReport): string;
//# sourceMappingURL=triage-report.d.ts.map