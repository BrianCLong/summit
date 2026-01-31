import { AdversarialExample, AttackConfig, AdversarialAttackType } from '../types';

/**
 * Black-box Adversarial Attacks
 *
 * Attacks that don't require access to model gradients or architecture.
 */
export class BlackBoxAttack {
  /**
   * Zero-order optimization (ZOO) attack
   * Estimates gradients using finite differences
   */
  async generateZOO(
    input: number[],
    predict: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.1;
    const iterations = config.iterations || 100;
    const queryBudget = config.queryLimit || 10000;
    const h = 0.001; // Finite difference parameter

    let perturbedInput = [...input];
    const perturbation: number[] = new Array(input.length).fill(0);
    let queryCount = 0;

    for (let iter = 0; iter < iterations && queryCount < queryBudget; iter++) {
      // Estimate gradients using finite differences
      const estimatedGradients = await this.estimateGradients(
        perturbedInput,
        predict,
        h
      );
      queryCount += 2 * input.length; // Two queries per dimension

      // Update perturbation
      const stepSize = epsilon / iterations;
      perturbedInput = perturbedInput.map((val, idx) => {
        const step = stepSize * Math.sign(estimatedGradients[idx]);
        perturbation[idx] = Math.max(-epsilon, Math.min(epsilon, perturbation[idx] + step));
        return Math.max(0, Math.min(1, input[idx] + perturbation[idx]));
      });
    }

    const perturbationNorm = Math.max(...perturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation,
      originalPrediction: 0,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.BLACK_BOX,
      metadata: {
        epsilon,
        iterations,
        queryCount,
        method: 'ZOO'
      },
      createdAt: new Date()
    };
  }

  /**
   * Boundary attack - starts from adversarial and walks along boundary
   */
  async generateBoundaryAttack(
    input: number[],
    initialAdversarial: number[],
    predict: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const iterations = config.iterations || 1000;
    const queryBudget = config.queryLimit || 10000;
    let queryCount = 0;

    let currentAdversarial = [...initialAdversarial];
    let bestDistance = this.l2Distance(input, currentAdversarial);

    const originalLogits = await predict(input);
    const originalClass = this.argmax(originalLogits);
    queryCount++;

    for (let iter = 0; iter < iterations && queryCount < queryBudget; iter++) {
      // Generate random direction
      const direction = this.randomDirection(input.length);

      // Orthogonalize to line between input and current adversarial
      const diff = input.map((val, idx) => val - currentAdversarial[idx]);
      const orthogonal = this.orthogonalize(direction, diff);

      // Take step along boundary
      const delta = 0.01;
      const candidate = currentAdversarial.map((val, idx) => {
        return Math.max(0, Math.min(1, val + delta * orthogonal[idx]));
      });

      // Check if still adversarial
      const candidateLogits = await predict(candidate);
      const candidateClass = this.argmax(candidateLogits);
      queryCount++;

      if (candidateClass !== originalClass) {
        const candidateDistance = this.l2Distance(input, candidate);
        if (candidateDistance < bestDistance) {
          currentAdversarial = candidate;
          bestDistance = candidateDistance;
        }
      }

      // Move closer to original input
      if (iter % 10 === 0) {
        const stepTowardOriginal = 0.01;
        const candidateCloser = currentAdversarial.map((val, idx) => {
          const direction = input[idx] - val;
          return Math.max(0, Math.min(1, val + stepTowardOriginal * direction));
        });

        const closerLogits = await predict(candidateCloser);
        const closerClass = this.argmax(closerLogits);
        queryCount++;

        if (closerClass !== originalClass) {
          currentAdversarial = candidateCloser;
          bestDistance = this.l2Distance(input, currentAdversarial);
        }
      }
    }

    const perturbation = currentAdversarial.map((val, idx) => val - input[idx]);
    const perturbationNorm = Math.sqrt(
      perturbation.reduce((sum, p) => sum + p * p, 0)
    );

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput: currentAdversarial,
      perturbation,
      originalPrediction: originalClass,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.BLACK_BOX,
      metadata: {
        iterations,
        queryCount,
        method: 'Boundary-Attack'
      },
      createdAt: new Date()
    };
  }

  /**
   * Query-efficient score-based attack
   */
  async generateScoreBased(
    input: number[],
    predict: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.1;
    const iterations = config.iterations || 100;
    const queryBudget = config.queryLimit || 5000;
    const samples = 20; // Number of random samples per iteration

    let perturbedInput = [...input];
    const perturbation: number[] = new Array(input.length).fill(0);
    let queryCount = 0;

    // Get original class
    const originalLogits = await predict(input);
    const originalClass = this.argmax(originalLogits);
    queryCount++;

    for (let iter = 0; iter < iterations && queryCount < queryBudget; iter++) {
      // Sample random directions
      const directions: number[][] = [];
      const scores: number[] = [];

      for (let s = 0; s < samples && queryCount < queryBudget; s++) {
        const direction = this.randomDirection(input.length);
        const delta = 0.01;

        const candidate = perturbedInput.map((val, idx) => {
          const newVal = val + delta * direction[idx];
          return Math.max(0, Math.min(1, newVal));
        });

        const logits = await predict(candidate);
        queryCount++;

        // Score is decrease in correct class probability
        const score = originalLogits[originalClass] - logits[originalClass];

        directions.push(direction);
        scores.push(score);
      }

      // Weight directions by scores
      const estimatedGradient = new Array(input.length).fill(0);
      const totalScore = scores.reduce((a, b) => a + Math.max(0, b), 0);

      if (totalScore > 0) {
        for (let s = 0; s < samples; s++) {
          const weight = Math.max(0, scores[s]) / totalScore;
          directions[s].forEach((d, idx) => {
            estimatedGradient[idx] += weight * d;
          });
        }
      }

      // Update perturbation
      const stepSize = epsilon / iterations;
      perturbedInput = perturbedInput.map((val, idx) => {
        const step = stepSize * Math.sign(estimatedGradient[idx]);
        perturbation[idx] = Math.max(-epsilon, Math.min(epsilon, perturbation[idx] + step));
        return Math.max(0, Math.min(1, input[idx] + perturbation[idx]));
      });
    }

    const perturbationNorm = Math.max(...perturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation,
      originalPrediction: originalClass,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.BLACK_BOX,
      metadata: {
        epsilon,
        iterations,
        queryCount,
        samples,
        method: 'Score-Based'
      },
      createdAt: new Date()
    };
  }

  /**
   * Transfer attack using substitute model
   */
  async generateTransferAttack(
    input: number[],
    substituteGradients: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.1;
    const iterations = config.iterations || 40;
    const stepSize = config.stepSize || epsilon / iterations;

    let perturbedInput = [...input];
    const perturbation: number[] = new Array(input.length).fill(0);

    // Use gradients from substitute model
    for (let iter = 0; iter < iterations; iter++) {
      const gradients = await substituteGradients(perturbedInput);

      // Apply FGSM-like step using substitute gradients
      perturbedInput = perturbedInput.map((val, idx) => {
        const step = stepSize * Math.sign(gradients[idx]);
        perturbation[idx] = Math.max(-epsilon, Math.min(epsilon, perturbation[idx] + step));
        return Math.max(0, Math.min(1, input[idx] + perturbation[idx]));
      });
    }

    const perturbationNorm = Math.max(...perturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation,
      originalPrediction: 0,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.BLACK_BOX,
      metadata: {
        epsilon,
        iterations,
        stepSize,
        method: 'Transfer-Attack',
        usesSubstituteModel: true
      },
      createdAt: new Date()
    };
  }

  private async estimateGradients(
    input: number[],
    predict: (input: number[]) => Promise<number[]>,
    h: number
  ): Promise<number[]> {
    const gradients: number[] = [];

    const baseLogits = await predict(input);
    const baseClass = this.argmax(baseLogits);

    for (let i = 0; i < input.length; i++) {
      // Perturb dimension i
      const inputPlus = [...input];
      inputPlus[i] += h;

      const logitsPlus = await predict(inputPlus);

      // Finite difference approximation
      const gradient = (logitsPlus[baseClass] - baseLogits[baseClass]) / h;
      gradients.push(gradient);
    }

    return gradients;
  }

  private randomDirection(dimension: number): number[] {
    const direction: number[] = [];
    for (let i = 0; i < dimension; i++) {
      direction.push(Math.random() * 2 - 1);
    }

    // Normalize
    const norm = Math.sqrt(direction.reduce((sum, d) => sum + d * d, 0));
    return direction.map(d => d / norm);
  }

  private orthogonalize(v1: number[], v2: number[]): number[] {
    // Gram-Schmidt orthogonalization
    const dot = v1.reduce((sum, val, idx) => sum + val * v2[idx], 0);
    const v2Norm = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));

    const projection = dot / (v2Norm * v2Norm);
    const orthogonal = v1.map((val, idx) => val - projection * v2[idx]);

    // Normalize
    const norm = Math.sqrt(orthogonal.reduce((sum, val) => sum + val * val, 0));
    return orthogonal.map(val => val / (norm || 1));
  }

  private l2Distance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0)
    );
  }

  private argmax(array: number[]): number {
    return array.indexOf(Math.max(...array));
  }

  private generateId(): string {
    return `blackbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
