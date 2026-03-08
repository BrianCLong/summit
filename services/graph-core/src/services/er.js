"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreEntities = scoreEntities;
exports.enqueueCandidate = enqueueCandidate;
exports.decide = decide;
exports.getDecision = getDecision;
exports.getExplanation = getExplanation;
exports.listCandidates = listCandidates;
/**
 * Calculates the Levenshtein distance (edit distance) between two strings.
 * Uses dynamic programming to compute the minimum number of single-character
 * edits (insertions, deletions, or substitutions) required to transform one
 * string into another. Case-insensitive comparison.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns The edit distance between the two strings
 */
function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++)
        matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++)
        matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[a.length][b.length];
}
/**
 * Calculates fuzzy similarity between two strings using Levenshtein distance.
 * Returns a normalized score between 0 and 1, where 1 means identical strings
 * and 0 means completely different. Handles undefined/null values gracefully.
 *
 * @param a - First string to compare (optional)
 * @param b - Second string to compare (optional)
 * @returns Similarity score between 0 and 1, or 0 if either string is undefined
 */
function fuzzySimilarity(a, b) {
    if (!a || !b)
        return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 0 : 1 - dist / maxLen;
}
const weights = { name: 0.6, email: 0.4 };
/**
 * Computes a weighted similarity score between two entities for entity resolution.
 * Compares entity attributes (name, email) using fuzzy matching and combines them
 * using predefined weights to produce an overall match score.
 *
 * @param a - First entity to compare
 * @param b - Second entity to compare
 * @returns CandidateScore object containing the overall score, feature breakdown, and weights
 * @example
 * const scoreResult = scoreEntities(entity1, entity2);
 * if (scoreResult.score > 0.8) {
 *   console.log('High confidence match');
 * }
 */
function scoreEntities(a, b) {
    const breakdown = {};
    let score = 0;
    const nameSim = fuzzySimilarity(a.attributes.name, b.attributes.name);
    breakdown.name = Number((nameSim * weights.name).toFixed(2));
    score += breakdown.name;
    const emailSim = fuzzySimilarity(a.attributes.email, b.attributes.email);
    breakdown.email = Number((emailSim * weights.email).toFixed(2));
    score += breakdown.email;
    return {
        id: `${a.id}|${b.id}`,
        score: Number(score.toFixed(2)),
        breakdown,
        weights,
    };
}
const decisions = new Map();
const explanations = new Map();
/**
 * Adds a candidate match to the review queue for human decision-making.
 * Stores the scoring details for later retrieval and explanation.
 *
 * @param score - The candidate score object to enqueue
 */
function enqueueCandidate(score) {
    explanations.set(score.id, score);
}
/**
 * Records a human decision on whether two entities should be merged.
 * Stores the decision along with metadata about who made it and when.
 *
 * @param candidateId - The unique identifier for the candidate pair
 * @param approved - Whether the merge was approved (true) or rejected (false)
 * @param user - The identifier of the user making the decision
 */
function decide(candidateId, approved, user) {
    decisions.set(candidateId, {
        candidateId,
        approved,
        by: user,
        at: new Date().toISOString(),
    });
}
/**
 * Retrieves a previously recorded decision for a candidate pair.
 *
 * @param id - The unique identifier for the candidate pair
 * @returns The decision object if found, undefined otherwise
 */
function getDecision(id) {
    return decisions.get(id);
}
/**
 * Retrieves the scoring explanation for a candidate pair.
 * Useful for understanding why entities were matched and with what confidence.
 *
 * @param id - The unique identifier for the candidate pair
 * @returns The CandidateScore object if found, undefined otherwise
 */
function getExplanation(id) {
    return explanations.get(id);
}
/**
 * Lists all candidate pairs currently in the review queue.
 *
 * @returns Array of CandidateScore objects representing all queued candidates
 */
function listCandidates() {
    return Array.from(explanations.values());
}
