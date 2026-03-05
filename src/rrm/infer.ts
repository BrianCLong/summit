import crypto from 'crypto';

export class RewardModelInference {
    // Mock weights
    private weights: number[];

    constructor(weights: number[] = [0.5, 0.1, 0.1]) {
        this.weights = weights;
    }

    infer(features: number[]) {
        let score = 0;
        for (let i = 0; i < Math.min(this.weights.length, features.length); i++) {
            score += this.weights[i] * features[i];
        }

        // Return score and deterministic hash
        return {
            score,
            timestampHash: crypto.createHash('sha256').update(String(score)).digest('hex')
        };
    }
}
