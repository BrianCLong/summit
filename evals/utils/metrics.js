/**
 * Measures how many of the expected entities from the ground truth
 * are present in the response.
 */
export function calculateCompleteness(response, expectedEntities) {
  if (expectedEntities.length === 0) return 1.0;

  const found = expectedEntities.filter(entity =>
    response.toLowerCase().includes(entity.toLowerCase())
  );

  return found.length / expectedEntities.length;
}

/**
 * Verifies that cited entities in the response are actually present
 * in the provided response path (simulated as entities mentioned in the response).
 */
export function calculateCitationAccuracy(response, citedEntities) {
  if (citedEntities.length === 0) return 1.0;

  const validCitations = citedEntities.filter(entity =>
    response.toLowerCase().includes(entity.toLowerCase())
  );

  return validCitations.length / citedEntities.length;
}

/**
 * Calculates a simple relevance score based on keyword overlap
 * between the response and the query intent.
 */
export function calculateRelevance(response, intent) {
  const intentKeywords = intent.toLowerCase().split(' ');
  const responseLower = response.toLowerCase();

  const matches = intentKeywords.filter(keyword => responseLower.includes(keyword));
  return intentKeywords.length > 0 ? matches.length / intentKeywords.length : 1.0;
}

/**
 * Measures confidence calibration.
 * Ideally, high confidence should correlate with high accuracy (completeness).
 */
export function calculateConfidenceCalibration(confidence, accuracy) {
  // Simple calibration: 1 - absolute difference
  return 1 - Math.abs(confidence - accuracy);
}
