/**
 * Comment drafting module
 * Drafts comments for deduplicated clusters
 */
import { IssueCluster, TriageItem } from '../types.js';
export interface CommentDraft {
    issueId: string;
    comment: string;
    relatedIssues: string[];
    action: 'duplicate' | 'cluster-summary' | 'auto-triage';
}
/**
 * Draft deduplication comments for clustered issues
 */
export declare function draftDeduplicationComments(cluster: IssueCluster): CommentDraft[];
/**
 * Draft auto-triage comments with classification results
 */
export declare function draftAutoTriageComment(item: TriageItem): CommentDraft;
/**
 * Draft batch comments for all issues
 */
export declare function draftBatchComments(items: TriageItem[], clusters: IssueCluster[]): CommentDraft[];
//# sourceMappingURL=comment-drafter.d.ts.map