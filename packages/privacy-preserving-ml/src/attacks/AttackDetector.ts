/**
 * Privacy Attack Detection
 * Detect membership inference and model inversion attacks
 */

export class AttackDetector {
  /**
   * Detect membership inference attack
   */
  detectMembershipInference(
    model: any,
    trainingLosses: number[],
    testLosses: number[],
    threshold: number = 0.3
  ): { detected: boolean; confidence: number; details: string } {
    const avgTrainLoss = trainingLosses.reduce((a, b) => a + b, 0) / trainingLosses.length;
    const avgTestLoss = testLosses.reduce((a, b) => a + b, 0) / testLosses.length;

    const lossGap = Math.abs(avgTrainLoss - avgTestLoss);
    const detected = lossGap > threshold;

    return {
      detected,
      confidence: Math.min(1, lossGap / threshold),
      details: detected
        ? `Loss gap ${lossGap.toFixed(3)} exceeds threshold ${threshold}`
        : 'No membership inference attack detected',
    };
  }

  /**
   * Detect model inversion attack
   */
  detectModelInversion(
    reconstructedSamples: number[][],
    originalSamples: number[][],
    threshold: number = 0.7
  ): { detected: boolean; confidence: number; details: string } {
    const similarities = reconstructedSamples.map((recon, i) =>
      this.cosineSimilarity(recon, originalSamples[i])
    );

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const detected = avgSimilarity > threshold;

    return {
      detected,
      confidence: avgSimilarity,
      details: detected
        ? `Average similarity ${avgSimilarity.toFixed(3)} exceeds threshold ${threshold}`
        : 'No model inversion attack detected',
    };
  }

  /**
   * Detect gradient leakage
   */
  detectGradientLeakage(
    gradients: number[][],
    threshold: number = 0.5
  ): { detected: boolean; confidence: number; details: string } {
    // Check for abnormally high gradient norms
    const norms = gradients.map((g) =>
      Math.sqrt(g.reduce((sum, val) => sum + val * val, 0))
    );

    const avgNorm = norms.reduce((a, b) => a + b, 0) / norms.length;
    const maxNorm = Math.max(...norms);
    const ratio = maxNorm / avgNorm;

    const detected = ratio > threshold;

    return {
      detected,
      confidence: Math.min(1, ratio / threshold),
      details: detected
        ? `Max/avg gradient norm ratio ${ratio.toFixed(3)} exceeds threshold ${threshold}`
        : 'No gradient leakage detected',
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
  }
}
