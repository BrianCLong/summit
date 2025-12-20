/**
 * Issue clustering
 * Groups similar issues together and identifies themes
 */
import { TriageItem, IssueCluster } from '../types.js';
import { ClusteringConfig } from '../config.js';
/**
 * Simple TF-IDF based clustering without external dependencies
 */
export declare function clusterIssues(items: TriageItem[], config: ClusteringConfig): IssueCluster[];
//# sourceMappingURL=issue-clusterer.d.ts.map