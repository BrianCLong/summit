const natural = require("natural");

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
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
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
   * Generates character n-grams from a string for blocking.
   * @param {string} text The input text.
   * @param {number} n The n-gram size (default 3 for trigrams).
   * @returns {Array<string>} Array of n-grams.
   * @private
   */
  _generateNGrams(text, n = 3) {
    if (!text || text.length < n) {
      return [text || ""];
    }
    const normalized = text.toLowerCase().trim();
    const ngrams = [];
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.push(normalized.substring(i, i + n));
    }
    return ngrams;
  }

  /**
   * Builds an inverted index mapping n-grams to entity indices.
   * @param {Array<Object>} entities The entities to index.
   * @param {number} ngramSize The n-gram size for indexing.
   * @returns {Map<string, Set<number>>} Inverted index of n-gram → entity indices.
   * @private
   */
  _buildNGramIndex(entities, ngramSize = 3) {
    const index = new Map();

    entities.forEach((entity, idx) => {
      const labelNGrams = this._generateNGrams(entity.label, ngramSize);
      labelNGrams.forEach((ngram) => {
        if (!index.has(ngram)) {
          index.set(ngram, new Set());
        }
        index.get(ngram).add(idx);
      });
    });

    return index;
  }

  /**
   * Gets candidate pairs for an entity using the n-gram index (blocking).
   * Only returns entities that share at least one n-gram with the query entity.
   * @param {number} entityIdx The index of the query entity.
   * @param {Object} entity The query entity.
   * @param {Map<string, Set<number>>} index The n-gram inverted index.
   * @param {number} ngramSize The n-gram size.
   * @returns {Set<number>} Set of entity indices that are candidate pairs.
   * @private
   */
  _getCandidatePairs(entityIdx, entity, index, ngramSize = 3) {
    const candidates = new Set();
    const labelNGrams = this._generateNGrams(entity.label, ngramSize);

    labelNGrams.forEach((ngram) => {
      const matchingEntities = index.get(ngram);
      if (matchingEntities) {
        matchingEntities.forEach((idx) => {
          // Only add indices greater than current to avoid duplicates
          if (idx > entityIdx) {
            candidates.add(idx);
          }
        });
      }
    });

    return candidates;
  }

  /**
   * Finds potential duplicate entities based on text, topology, and provenance similarity.
   *
   * OPTIMIZED VERSION using n-gram blocking to reduce time complexity:
   * - Old: O(n²) - compares all pairs
   * - New: O(n × k) where k is average candidates per entity (typically k << n)
   * - For 1000 entities: O(n²) = ~500K comparisons vs O(n×k) = ~50K comparisons (10x faster)
   *
   * Uses trigram (3-character) blocking:
   * 1. Builds inverted index: n-gram → entity IDs
   * 2. For each entity, only compares against entities sharing ≥1 n-gram
   * 3. Falls back to O(n²) for small datasets (<100 entities) where indexing overhead exceeds benefit
   *
   * @param {Array<Object>} entities A list of entities to compare.
   * @param {number} threshold The similarity threshold (default 0.8).
   * @param {Object} options Optional configuration.
   * @param {boolean} options.useBlocking Whether to use n-gram blocking (default true for n>100).
   * @param {number} options.ngramSize Size of n-grams for blocking (default 3).
   * @returns {Array<Object>} A list of potential duplicate pairs with similarity scores.
   */
  findDuplicateCandidates(entities, threshold = 0.8, options = {}) {
    const useBlocking =
      options.useBlocking !== undefined ? options.useBlocking : entities.length > 100; // Auto-enable for large datasets
    const ngramSize = options.ngramSize || 3;

    if (!useBlocking) {
      // Use original O(n²) algorithm for small datasets
      return this._findDuplicateCandidatesBruteForce(entities, threshold);
    }

    // Build n-gram index for blocking
    const startIndexing = Date.now();
    const ngramIndex = this._buildNGramIndex(entities, ngramSize);
    const indexingTime = Date.now() - startIndexing;

    const candidates = [];
    const startComparison = Date.now();
    let comparisonsPerformed = 0;

    for (let i = 0; i < entities.length; i++) {
      const entityA = entities[i];

      // Get candidate pairs using blocking
      const candidatePairs = this._getCandidatePairs(i, entityA, ngramIndex, ngramSize);

      // Compare only against blocked candidates
      for (const j of candidatePairs) {
        const entityB = entities[j];
        comparisonsPerformed++;

        const labelSimilarity = this.calculateTextSimilarity(entityA.label, entityB.label);
        const descriptionSimilarity = this.calculateTextSimilarity(
          entityA.description,
          entityB.description
        );
        const textSimilarity = labelSimilarity * 0.7 + descriptionSimilarity * 0.3;

        const topologySimilarity = this.calculateTopologySimilarity(
          entityA.relationships.map((r) => r.targetEntity.id),
          entityB.relationships.map((r) => r.targetEntity.id)
        );

        const provenanceSimilarity = this.calculateProvenanceSimilarity(
          entityA.source,
          entityB.source
        );

        // Weighted average
        const overallSimilarity =
          textSimilarity * 0.6 + topologySimilarity * 0.3 + provenanceSimilarity * 0.1;

        if (overallSimilarity >= threshold) {
          const reasons = [];
          if (textSimilarity > 0.8) reasons.push("High text similarity");
          if (topologySimilarity > 0.5) reasons.push("Significant neighbor overlap");
          if (provenanceSimilarity > 0) reasons.push("Same source");

          candidates.push({
            entityA,
            entityB,
            similarity: overallSimilarity,
            reasons: reasons.length > 0 ? reasons : ["Overall similarity threshold met"],
          });
        }
      }
    }

    const comparisonTime = Date.now() - startComparison;

    // Log performance metrics (for observability)
    const totalPossibleComparisons = (entities.length * (entities.length - 1)) / 2;
    const reductionPercentage = (
      (1 - comparisonsPerformed / totalPossibleComparisons) *
      100
    ).toFixed(1);

    console.log(
      `[SimilarityService] Performance: indexed ${entities.length} entities in ${indexingTime}ms, ` +
        `performed ${comparisonsPerformed}/${totalPossibleComparisons} comparisons (${reductionPercentage}% reduction) ` +
        `in ${comparisonTime}ms, found ${candidates.length} candidates`
    );

    return candidates;
  }

  /**
   * Original brute-force O(n²) implementation.
   * Kept for small datasets and as a reference for correctness testing.
   * @param {Array<Object>} entities A list of entities to compare.
   * @param {number} threshold The similarity threshold.
   * @returns {Array<Object>} A list of potential duplicate pairs.
   * @private
   */
  _findDuplicateCandidatesBruteForce(entities, threshold = 0.8) {
    const candidates = [];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        const labelSimilarity = this.calculateTextSimilarity(entityA.label, entityB.label);
        const descriptionSimilarity = this.calculateTextSimilarity(
          entityA.description,
          entityB.description
        );
        const textSimilarity = labelSimilarity * 0.7 + descriptionSimilarity * 0.3;

        const topologySimilarity = this.calculateTopologySimilarity(
          entityA.relationships.map((r) => r.targetEntity.id),
          entityB.relationships.map((r) => r.targetEntity.id)
        );

        const provenanceSimilarity = this.calculateProvenanceSimilarity(
          entityA.source,
          entityB.source
        );

        const overallSimilarity =
          textSimilarity * 0.6 + topologySimilarity * 0.3 + provenanceSimilarity * 0.1;

        if (overallSimilarity >= threshold) {
          const reasons = [];
          if (textSimilarity > 0.8) reasons.push("High text similarity");
          if (topologySimilarity > 0.5) reasons.push("Significant neighbor overlap");
          if (provenanceSimilarity > 0) reasons.push("Same source");

          candidates.push({
            entityA,
            entityB,
            similarity: overallSimilarity,
            reasons: reasons.length > 0 ? reasons : ["Overall similarity threshold met"],
          });
        }
      }
    }
    return candidates;
  }
}

module.exports = new SimilarityService();
