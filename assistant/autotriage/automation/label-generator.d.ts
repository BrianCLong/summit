/**
 * Auto-labeling module
 * Generates GitHub labels and titles for issues
 */
import { TriageItem } from '../types.js';
export interface LabelSuggestion {
    issueId: string;
    labels: string[];
    suggestedTitle?: string;
    confidence: number;
}
export declare function generateLabels(item: TriageItem): LabelSuggestion;
export declare function generateBatchLabels(items: TriageItem[]): LabelSuggestion[];
/**
 * Generate improved title for an issue
 */
export declare function suggestImprovedTitle(item: TriageItem): string | undefined;
/**
 * Generate GitHub API payload for bulk label update
 */
export declare function generateGitHubLabelPayload(suggestion: LabelSuggestion): any;
//# sourceMappingURL=label-generator.d.ts.map