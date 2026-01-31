
import { SocialPost, NarrativeCluster, AnomalyDetectionResult } from './types.js';

export class NarrativeTracker {

  /**
   * Clusters posts into narratives based on content similarity.
   * Optimized using an inverted index to avoid O(N^2) comparisons.
   */
  public clusterNarratives(posts: SocialPost[]): NarrativeCluster[] {
    const clusters: NarrativeCluster[] = [];
    const processed = new Set<string>();

    // Pre-process: build inverted index (keyword -> postIds)
    const keywordIndex = new Map<string, string[]>();
    const postKeywords = new Map<string, Set<string>>();

    for (const post of posts) {
       const keywords = this.extractKeywords(post.content);
       postKeywords.set(post.id, keywords);
       for (const k of keywords) {
           if (!keywordIndex.has(k)) keywordIndex.set(k, []);
           keywordIndex.get(k)!.push(post.id);
       }
    }

    for (const post of posts) {
      if (processed.has(post.id)) continue;

      const clusterPosts = [post];
      processed.add(post.id);

      const keywords = postKeywords.get(post.id)!;
      const candidates = new Set<string>();

      // Only check posts that share at least one keyword
      for (const k of keywords) {
          const ids = keywordIndex.get(k) || [];
          for (const id of ids) candidates.add(id);
      }

      for (const candidateId of candidates) {
        if (processed.has(candidateId) || candidateId === post.id) continue;

        const otherPost = posts.find(p => p.id === candidateId);
        if (!otherPost) continue;

        const otherKeywords = postKeywords.get(candidateId)!;
        if (this.calculateJaccardSimilarity(keywords, otherKeywords) > 0.3) {
            clusterPosts.push(otherPost);
            processed.add(candidateId);
        }
      }

      if (clusterPosts.length >= 3) {
        clusters.push({
            id: `NARRATIVE_${Date.now()}_${clusters.length}`,
            keywords: Array.from(keywords).slice(0, 5),
            exemplarPosts: clusterPosts.map(p => p.id).slice(0, 3),
            sentiment: 0, // Placeholder
            volume: clusterPosts.length,
            velocity: this.calculateVelocity(clusterPosts),
        });
      }
    }

    return clusters;
  }

  /**
   * Detects if a narrative is artificially amplified (Astroturfing).
   */
  public detectArtificialAmplification(cluster: NarrativeCluster): AnomalyDetectionResult {
    // High velocity with low organic diversity usually indicates amplification.
    // Since we don't have full organic metrics, we use volume/velocity heuristics.

    if (cluster.velocity > 10 && cluster.volume > 100) {
        return {
            isAnomalous: true,
            score: 0.8,
            reason: 'High velocity narrative propagation suggesting artificial amplification',
        };
    }

    return {
        isAnomalous: false,
        score: 0.1,
        reason: 'Normal propagation patterns',
    };
  }

  /**
   * Detects non-organic linguistic patterns.
   */
  public detectLinguisticAnomalies(posts: SocialPost[]): AnomalyDetectionResult {
     // Check for exact copy-pasting (copypasta)
     const contentCounts = new Map<string, number>();
     let maxRepeats = 0;

     for (const post of posts) {
         const count = (contentCounts.get(post.content) || 0) + 1;
         contentCounts.set(post.content, count);
         maxRepeats = Math.max(maxRepeats, count);
     }

     if (maxRepeats > 5) {
         return {
             isAnomalous: true,
             score: Math.min(maxRepeats / 20, 1),
             reason: `Identical content repeated ${maxRepeats} times`,
         };
     }

     return {
         isAnomalous: false,
         score: 0,
         reason: 'No linguistic anomalies detected',
     };
  }

  private extractKeywords(content: string): Set<string> {
      // Simple whitespace tokenizer + filter short words
      return new Set(
          content.toLowerCase()
          .split(/\W+/)
          .filter(w => w.length > 4)
      );
  }

  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private calculateVelocity(posts: SocialPost[]): number {
      if (posts.length < 2) return 0;
      const timestamps = posts.map(p => p.timestamp.getTime()).sort((a, b) => a - b);
      const durationMinutes = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60) || 1;
      return posts.length / durationMinutes;
  }
}
