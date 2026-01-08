
import { v4 as uuidv4 } from 'uuid';
import EmbeddingService from '../EmbeddingService.js';
import logger from '../../utils/logger.js';
// @ts-ignore - CommonJS module import
import EntityCorrelationEngine from '../EntityCorrelationEngine.js';

/**
 * Advanced Correlation Engine
 *
 * Implements cross-source data correlation using:
 * 1. Vector similarity (via EmbeddingService)
 * 2. Temporal alignment (time window clustering)
 * 3. Semantic clustering (concept extraction and grouping)
 */
export class AdvancedCorrelationEngine {
  private embeddingService: EmbeddingService;
  private baseCorrelationEngine: any;
  private logger = logger.child({ service: 'AdvancedCorrelationEngine' });

  constructor(
    embeddingService?: EmbeddingService,
    baseCorrelationEngine?: any
  ) {
    this.embeddingService = embeddingService || new EmbeddingService();
    this.baseCorrelationEngine = baseCorrelationEngine || new EntityCorrelationEngine();
  }

  /**
   * Correlate entities across multiple dimensions
   * @param entities List of entities to correlate
   * @param options Configuration options
   */
  async correlate(entities: any[], options: any = {}) {
    const {
      vectorThreshold = 0.85,
      timeWindowMs = 3600000, // 1 hour
      semanticThreshold = 0.7,
      useTransitive = true,
    } = options;

    this.logger.info(`Starting correlation for ${entities.length} entities`, { options });

    // 1. Initial grouping using base heuristics (Levenshtein, attributes)
    let groups = this.baseCorrelationEngine.groupSimilarEntities(entities);

    // 2. Temporal Alignment (Apply BEFORE vector refinement to avoid merging temporally distinct events too early)
    // Actually, temporal alignment is usually a constraint. If two things are far apart, they shouldn't be merged even if vector similar (unless they are same entity over time).
    // But here we are correlating "events" or "observations".
    // If we split by time first, then vector similarity might merge them back if we are not careful.
    // Let's keep the order but ensuring applyTemporalAlignment strictly splits.

    // 3. Temporal Alignment
    // Check if events/entities fall within the same time window to boost correlation confidence
    // or to split unrelated events that just happen to look similar textually
    // We apply this BEFORE vector refinement so we start with temporally coherent groups if possible,
    // OR we apply it AFTER to split groups that were merged by name but are temporally distinct.
    // The test failure suggests that `refineWithVectorSimilarity` or `baseCorrelationEngine` merged them, and `applyTemporalAlignment` failed to split them.

    // Let's trace why applyTemporalAlignment didn't split.
    // It iterates over groups. If a group has multiple items, it sorts by time and clusters.
    // If the gap > windowMs, it starts a new cluster.
    // e1 and e2 are 24h apart. window is 1h. They should be split.
    // Why did it return 1 group?

    // Maybe `refineWithVectorSimilarity` is re-merging them?
    // In the test, I set vectorThreshold=0.0.
    // If I apply temporal AFTER vector, vector merges them (because I forced it), then temporal SHOULD split them.

    // Ah, I see `refineWithVectorSimilarity` calls `areGroupsSimilar` which merges groups if ANY two entities match.
    // If `vectorThreshold` is 0.0, they will ALWAYS merge in step 2.
    // Then step 3 `applyTemporalAlignment` takes that big group [e1, e2] and SHOULD split it.

    // Wait, the test failure says Expected 2, Received 1.
    // This means `applyTemporalAlignment` returned 1 group containing [e1, e2].
    // Why?
    // e1 time: 2023-01-01T10:00:00Z
    // e2 time: 2023-01-02T10:00:00Z
    // Diff is 24 hours. windowMs is 1 hour.
    // Code: if (t2 - t1 <= windowMs) ...
    // t2 - t1 is 86400000. windowMs is 3600000.
    // 86400000 <= 3600000 is FALSE.
    // So it should push currentCluster and start new one.

    // Is it possible the timestamps are not parsed correctly?
    // Date.parse('2023-01-01T10:00:00Z') works fine.

    // Let's debugging logs in `applyTemporalAlignment`.

    // For now, let's swap the order: Temporal first, then Vector.
    // But Vector might re-merge them if I don't pass time constraint to Vector.
    // The issue is likely that `refineWithVectorSimilarity` is too aggressive or `applyTemporalAlignment` logic has a bug.

    // Actually, I suspect `refineWithVectorSimilarity` is NOT the problem if `applyTemporalAlignment` runs AFTER.
    // Unless... `applyTemporalAlignment` is not being called or modifying `groups` in place?
    // It returns `timeAlignedGroups`.

    // Let's add logs to `applyTemporalAlignment` to see what's happening.

    groups = await this.refineWithVectorSimilarity(groups, entities, vectorThreshold);
    groups = this.applyTemporalAlignment(groups, timeWindowMs);

    // 4. Semantic Clustering
    // Use embeddings to cluster based on broader concepts/topics
    // This can find hidden links between seemingly disparate entities
    // We also pass timeWindowMs to ensure we don't re-merge temporally distinct events that were just split.
    const clusters = await this.performSemanticClustering(groups, semanticThreshold, timeWindowMs);

    // 5. Finalize and Merge
    const results = clusters.map(cluster => this.mergeCluster(cluster));

    return results;
  }

  /**
   * Refine existing groups using vector embeddings
   */
  private async refineWithVectorSimilarity(groups: any[][], allEntities: any[], threshold: number) {
    // Generate embeddings for all entities if not present
    // Note: In a real system, we'd cache these or fetch from DB
    const entityEmbeddings = new Map();

    const textsToEmbed = allEntities
      .filter(e => !e.embedding && (e.description || e.label || e.text))
      .map(e => e.description || e.label || e.text);

    if (textsToEmbed.length > 0) {
      try {
        const embeddings = await this.embeddingService.generateEmbeddings(textsToEmbed);
        let idx = 0;
        for (const entity of allEntities) {
          if (!entity.embedding && (entity.description || entity.label || entity.text)) {
            entity.embedding = embeddings[idx++];
          }
        }
      } catch (err: any) {
        this.logger.error('Failed to generate embeddings during correlation', err);
      }
    }

    const newGroups: any[][] = [];
    const processed = new Set<string>();

    // Flatten groups to check for cross-group merges
    // Refine existing groups using vector embeddings
    // 1. Verify internal coherence (Splitting)
    // 2. Try to merge separate groups. (Merging)

    const refinedGroups: any[][] = [];

    // Step 1: Verify internal coherence (Splitting)
    for (const group of groups) {
      if (group.length <= 1) {
        refinedGroups.push(group);
        continue;
      }

      const internalClusters = this.clusterByVector(group, threshold);
      refinedGroups.push(...internalClusters);
    }

    // Step 2: Try to merge the now-refined groups (Merging)
    // Deep copy to work on
    const mergedGroups = JSON.parse(JSON.stringify(refinedGroups));

    for (let i = 0; i < mergedGroups.length; i++) {
      for (let j = i + 1; j < mergedGroups.length; j++) {
        if (this.areGroupsSimilar(mergedGroups[i], mergedGroups[j], threshold)) {
          // Merge j into i
          mergedGroups[i] = [...mergedGroups[i], ...mergedGroups[j]];
          mergedGroups.splice(j, 1);
          j--; // Adjust index
        }
      }
    }

    return mergedGroups;
  }

  private clusterByVector(entities: any[], threshold: number): any[][] {
    const clusters: any[][] = [];
    const processed = new Set<string>();

    for (let i = 0; i < entities.length; i++) {
      if (processed.has(entities[i].id)) continue;

      const currentCluster = [entities[i]];
      processed.add(entities[i].id);

      for (let j = i + 1; j < entities.length; j++) {
        if (processed.has(entities[j].id)) continue;

        const e1 = entities[i];
        const e2 = entities[j];

        if (e1.embedding && e2.embedding) {
          const sim = this.cosineSimilarity(e1.embedding, e2.embedding);
          if (sim >= threshold) {
            currentCluster.push(e2);
            processed.add(e2.id);
          }
        } else {
          // If no embedding, fallback to assume they belong together (conservative)
          // OR assume they don't.
          // Since they were ALREADY grouped by base engine, we assume they belong together unless vector says otherwise.
          // But if vector is missing, we can't disprove it. So keep together.
          currentCluster.push(e2);
          processed.add(e2.id);
        }
      }
      clusters.push(currentCluster);
    }
    return clusters;
  }

  private areGroupsSimilar(g1: any[], g2: any[], threshold: number): boolean {
    // Check if any entity in g1 is vector-similar to any in g2
    for (const e1 of g1) {
      for (const e2 of g2) {
        if (e1.embedding && e2.embedding) {
          if (this.cosineSimilarity(e1.embedding, e2.embedding) >= threshold) return true;
        }
      }
    }
    return false;
  }

  /**
   * Apply temporal constraints to split or validate groups
   */
  private applyTemporalAlignment(groups: any[][], windowMs: number): any[][] {
    const timeAlignedGroups: any[][] = [];

    for (const group of groups) {
      if (group.length <= 1) {
        timeAlignedGroups.push(group);
        continue;
      }

      // If entities have timestamps, cluster them by time
      const withTime = group.filter(e => e.timestamp || e.createdAt);
      const withoutTime = group.filter(e => !e.timestamp && !e.createdAt);

      if (withTime.length < 1) {
        // No timed entities, can't split by time.
        timeAlignedGroups.push(group);
        continue;
      }

      // If we have at least 1 timed entity, we might still want to split if we have multiple timed ones that are far apart.
      // If we have only 1 timed entity, we can't split "it" from "itself".
      // But if there are mixed entities, we can't really judge without more info.
      // The failing test has 2 timed entities. So it should pass the check below.
      if (withTime.length < 2 && withoutTime.length === 0) {
        timeAlignedGroups.push(group);
        continue;
      }

      // Sort by time
      withTime.sort((a, b) => {
        const t1 = new Date(a.timestamp || a.createdAt).getTime();
        const t2 = new Date(b.timestamp || b.createdAt).getTime();
        return t1 - t2;
      });

      let currentCluster = [withTime[0]];
      const clusters = [];

      for (let i = 1; i < withTime.length; i++) {
        const prev = withTime[i - 1];
        const curr = withTime[i];
        const t1 = new Date(prev.timestamp || prev.createdAt).getTime();
        const t2 = new Date(curr.timestamp || curr.createdAt).getTime();

        if (t2 - t1 <= windowMs) {
          currentCluster.push(curr);
        } else {
          clusters.push(currentCluster);
          currentCluster = [curr];
        }
      }
      clusters.push(currentCluster);

      // Distribute "withoutTime" entities to the nearest/most similar cluster, or keep separate
      // For simplicity, we add them to ALL clusters (ambiguous) or the largest one.
      // Let's add to the largest cluster as a heuristic for "main event".
      if (withoutTime.length > 0) {
        const largest = clusters.reduce((p, c) => (p.length > c.length ? p : c), []);
        largest.push(...withoutTime);
      }

      timeAlignedGroups.push(...clusters);
    }

    return timeAlignedGroups;
  }

  /**
   * Semantic clustering to group related concepts
   */
  private async performSemanticClustering(groups: any[][], threshold: number, timeWindowMs: number) {
    // This step looks at the "merged" representation of each group and tries to find
    // higher-order links between groups.
    // For the purpose of "Correlation Engine", this might mean merging groups that are semantically close.

    // We compute a centroid embedding for each group
    const groupCentroids = groups.map(group => {
      const embeddings = group
        .filter(e => e.embedding)
        .map(e => e.embedding);

      if (embeddings.length === 0) return null;

      // Average embedding
      const dim = embeddings[0].length;
      const centroid = new Array(dim).fill(0);
      for (const emb of embeddings) {
        for (let i = 0; i < dim; i++) {
          centroid[i] += emb[i];
        }
      }
      for (let i = 0; i < dim; i++) {
        centroid[i] /= embeddings.length;
      }
      return { group, centroid };
    });

    const validGroups = groupCentroids.filter(g => g !== null) as { group: any[], centroid: number[] }[];
    const resultGroups = [...groups.filter(g => !g.some(e => e.embedding))]; // Keep groups without embeddings

    // Cluster the valid groups
    const finalClusters: any[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < validGroups.length; i++) {
      if (processed.has(i)) continue;

      let cluster = [...validGroups[i].group];
      processed.add(i);

      for (let j = i + 1; j < validGroups.length; j++) {
        if (processed.has(j)) continue;

        const sim = this.cosineSimilarity(validGroups[i].centroid, validGroups[j].centroid);
        // Check both semantic similarity AND temporal compatibility
        const temporallyCompatible = this.areGroupsTemporallyCompatible(validGroups[i].group, validGroups[j].group, timeWindowMs);

        if (sim >= threshold && temporallyCompatible) {
          cluster = [...cluster, ...validGroups[j].group];
          processed.add(j);
        }
      }
      finalClusters.push(cluster);
    }

    return [...resultGroups, ...finalClusters];
  }

  private areGroupsTemporallyCompatible(g1: any[], g2: any[], windowMs: number): boolean {
    // If either group has no time info, we assume compatible (or not? conservative: compatible)
    // We check if merging them would create a cluster where items are too far apart?
    // Or just that the "nearest" items are close enough?
    // "Temporal Alignment" usually means: do they overlap or are they close?

    // Simple check: Check the time range of g1 and g2.
    // If Min(g2) - Max(g1) > window or Min(g1) - Max(g2) > window, then incompatible.

    const getTimes = (g: any[]) => g
      .map(e => e.timestamp || e.createdAt)
      .filter(t => t)
      .map(t => new Date(t).getTime());

    const t1 = getTimes(g1);
    const t2 = getTimes(g2);

    if (t1.length === 0 || t2.length === 0) return true; // No time info to conflict

    const min1 = Math.min(...t1);
    const max1 = Math.max(...t1);
    const min2 = Math.min(...t2);
    const max2 = Math.max(...t2);

    // Check if the gap between ranges is larger than window
    const gap = Math.max(0, min2 - max1, min1 - max2);

    return gap <= windowMs;
  }

  private mergeCluster(cluster: any[]) {
    // Use the base engine's merge logic to create a single fused entity
    const fused = this.baseCorrelationEngine.mergeEntities(cluster);

    // Add metadata about the correlation
    if (fused) {
      (fused as any).correlationMetadata = {
        sourceCount: new Set(cluster.map((e: any) => e.source)).size,
        entityCount: cluster.length,
        method: 'advanced-hybrid',
        constituents: cluster.map(e => e.id)
      };
    }
    return fused;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]) {
    if (vec1.length !== vec2.length) return 0;
    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }
}

export default AdvancedCorrelationEngine;
