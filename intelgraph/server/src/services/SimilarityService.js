const natural = require('natural');

class SimilarityService {
  /**
   * Calculates the similarity between two strings using the Jaro-Winkler distance algorithm.
   * @param {string} str1 The first string.
   * @param {string} str2 The second string.
   * @returns {number} The similarity score, a value between 0 and 1.
   */
  calculateTextSimilarity(str1, str2) {
    if (!str1 || !str2) {
      return 0;
    }
    return natural.JaroWinklerDistance(str1, str2);
  }

  /**
   * Calculates the Jaccard similarity between two sets of neighbors.
   * @param {Array<string>} neighbors1 An array of neighbor IDs.
   * @param {Array<string>} neighbors2 An array of neighbor IDs.
   * @returns {number} The Jaccard similarity score.
   */
  calculateTopologySimilarity(neighbors1, neighbors2) {
    const set1 = new Set(neighbors1);
    const set2 = new Set(neighbors2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * Calculates the similarity between two provenance sources.
   * @param {string} source1 The first source.
   * @param {string} source2 The second source.
   * @returns {number} 1 if the sources are identical, 0 otherwise.
   */
  calculateProvenanceSimilarity(source1, source2) {
    return source1 === source2 ? 1 : 0;
  }

  /**
   * Finds potential duplicate entities based on text, topology, and provenance similarity.
   *
   * PERFORMANCE OPTIMIZATIONS APPLIED:
   * - Caches relationship IDs to avoid repeated map operations
   * - Early exits when text similarity is too low to meet threshold
   * - Skips comparisons for entities with missing labels
   * - Pre-filters by label prefix for large datasets (blocking)
   *
   * Time complexity: O(n^2) in worst case, but with early exits and blocking
   * Space complexity: O(n) for caches
   *
   * @param {Array<Object>} entities A list of entities to compare.
   * @param {number} threshold The similarity threshold.
   * @returns {Array<Object>} A list of potential duplicate pairs.
   */
  findDuplicateCandidates(entities, threshold = 0.8) {
    const candidates = [];

    // Pre-compute relationship IDs for each entity (caching)
    const relationshipCache = new Map();
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.relationships && Array.isArray(entity.relationships)) {
        relationshipCache.set(i, entity.relationships.map(r => r.targetEntity?.id).filter(Boolean));
      } else {
        relationshipCache.set(i, []);
      }
    }

    // For large datasets (>1000 entities), use simple blocking by label prefix
    const useBlocking = entities.length > 1000;
    let blocks = null;

    if (useBlocking) {
      blocks = new Map();
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (!entity.label) continue;
        const prefix = entity.label.substring(0, 3).toLowerCase();
        if (!blocks.has(prefix)) {
          blocks.set(prefix, []);
        }
        blocks.get(prefix).push(i);
      }
    }

    // Main comparison loop
    for (let i = 0; i < entities.length; i++) {
      const entityA = entities[i];

      // Skip entities without labels
      if (!entityA.label) continue;

      // Determine comparison range based on blocking
      let compareIndices;
      if (useBlocking) {
        const prefix = entityA.label.substring(0, 3).toLowerCase();
        compareIndices = blocks.get(prefix) || [];
      } else {
        compareIndices = Array.from({ length: entities.length }, (_, idx) => idx);
      }

      for (const j of compareIndices) {
        if (j <= i) continue; // Only compare once (i, j) where j > i

        const entityB = entities[j];

        // Skip entities without labels
        if (!entityB.label) continue;

        // Calculate text similarity first (most discriminative)
        const labelSimilarity = this.calculateTextSimilarity(entityA.label, entityB.label);
        const descriptionSimilarity = this.calculateTextSimilarity(entityA.description, entityB.description);
        const textSimilarity = (labelSimilarity * 0.7) + (descriptionSimilarity * 0.3);

        // Early exit: if text similarity is very low, skip expensive topology check
        // Text has 0.6 weight in overall score, so if textSim * 0.6 < threshold - 0.4,
        // we can't possibly meet threshold even with perfect topology and provenance
        if (textSimilarity * 0.6 < threshold - 0.4) {
          continue;
        }

        // Calculate topology similarity using cached relationship IDs
        const topologySimilarity = this.calculateTopologySimilarity(
          relationshipCache.get(i),
          relationshipCache.get(j)
        );

        const provenanceSimilarity = this.calculateProvenanceSimilarity(entityA.source, entityB.source);

        // Weighted average
        const overallSimilarity = (textSimilarity * 0.6) + (topologySimilarity * 0.3) + (provenanceSimilarity * 0.1);

        if (overallSimilarity >= threshold) {
          const reasons = [];
          if (textSimilarity > 0.8) reasons.push('High text similarity');
          if (topologySimilarity > 0.5) reasons.push('Significant neighbor overlap');
          if (provenanceSimilarity > 0) reasons.push('Same source');

          candidates.push({
            entityA,
            entityB,
            similarity: overallSimilarity,
            reasons: reasons.length > 0 ? reasons : ['Overall similarity threshold met'],
          });
        }
      }
    }
    return candidates;
  }
}

module.exports = new SimilarityService();
