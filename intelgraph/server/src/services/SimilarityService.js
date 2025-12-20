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
   * This implementation has a time complexity of O(n^2) and may not scale well for very large datasets.
   * Future optimizations could include using a blocking or indexing technique to reduce the number of pairs to compare.
   * @param {Array<Object>} entities A list of entities to compare.
   * @param {number} threshold The similarity threshold.
   * @returns {Array<Object>} A list of potential duplicate pairs.
   */
  findDuplicateCandidates(entities, threshold = 0.8) {
    const candidates = [];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        const labelSimilarity = this.calculateTextSimilarity(entityA.label, entityB.label);
        const descriptionSimilarity = this.calculateTextSimilarity(entityA.description, entityB.description);
        const textSimilarity = (labelSimilarity * 0.7) + (descriptionSimilarity * 0.3);

        const topologySimilarity = this.calculateTopologySimilarity(
          entityA.relationships.map(r => r.targetEntity.id),
          entityB.relationships.map(r => r.targetEntity.id)
        );

        const provenanceSimilarity = this.calculateProvenanceSimilarity(entityA.source, entityB.source);

        // A simple weighted average
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
