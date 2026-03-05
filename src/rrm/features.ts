import crypto from 'crypto';

export class RewardModelFeatures {
  static extract(scores: Record<string, number>, graphFeatures: Record<string, any>) {
    // Mock extraction
    const sumScores = Object.values(scores).reduce((a, b) => a + b, 0);
    const avgScore = Object.values(scores).length > 0 ? sumScores / Object.values(scores).length : 0;

    // Feature vector mock
    const features = [
        avgScore,
        graphFeatures.nodeCount || 0,
        graphFeatures.edgeCount || 0,
    ];

    // Hash state
    const hash = crypto.createHash('sha256').update(JSON.stringify(features)).digest('hex');

    return { features, hash };
  }
}
