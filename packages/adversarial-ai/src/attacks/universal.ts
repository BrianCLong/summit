import { AdversarialExample, AttackConfig, AdversarialAttackType } from '../types';

/**
 * Universal Adversarial Perturbations
 *
 * Generates a single perturbation that can fool the model on most inputs.
 */
export class UniversalPerturbationAttack {
  /**
   * Generate universal adversarial perturbation
   */
  async generate(
    dataset: number[][],
    getLogits: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], classIdx: number) => Promise<number[]>,
    config: AttackConfig
  ): Promise<{
    perturbation: number[];
    foolingRate: number;
    examples: AdversarialExample[];
  }> {
    const epsilon = config.epsilon || 0.1;
    const maxIterations = config.iterations || 10;
    const foolingRateThreshold = 0.8;

    // Initialize universal perturbation
    let universalPerturbation = new Array(dataset[0].length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      let fooledCount = 0;

      for (const input of dataset) {
        // Apply current universal perturbation
        const perturbedInput = input.map((val, idx) => {
          const newVal = val + universalPerturbation[idx];
          return Math.max(0, Math.min(1, newVal));
        });

        // Get predictions
        const originalLogits = await getLogits(input);
        const perturbedLogits = await getLogits(perturbedInput);

        const originalClass = this.argmax(originalLogits);
        const perturbedClass = this.argmax(perturbedLogits);

        // If not fooled, update perturbation
        if (originalClass === perturbedClass) {
          // Compute DeepFool-like minimal perturbation for this sample
          const minimalPerturb = await this.computeMinimalPerturbation(
            perturbedInput,
            getLogits,
            getGradients,
            perturbedClass
          );

          // Add to universal perturbation
          universalPerturbation = universalPerturbation.map((val, idx) => {
            return val + minimalPerturb[idx];
          });

          // Project to epsilon ball
          const norm = Math.sqrt(
            universalPerturbation.reduce((sum, p) => sum + p * p, 0)
          );
          if (norm > epsilon) {
            universalPerturbation = universalPerturbation.map(p => p * (epsilon / norm));
          }
        } else {
          fooledCount++;
        }
      }

      const foolingRate = fooledCount / dataset.length;

      // Check if we've reached target fooling rate
      if (foolingRate >= foolingRateThreshold) {
        break;
      }
    }

    // Generate examples for all inputs
    const examples: AdversarialExample[] = [];
    let finalFooledCount = 0;

    for (const input of dataset) {
      const perturbedInput = input.map((val, idx) => {
        const newVal = val + universalPerturbation[idx];
        return Math.max(0, Math.min(1, newVal));
      });

      const originalLogits = await getLogits(input);
      const perturbedLogits = await getLogits(perturbedInput);

      const originalClass = this.argmax(originalLogits);
      const perturbedClass = this.argmax(perturbedLogits);

      if (originalClass !== perturbedClass) {
        finalFooledCount++;
      }

      const perturbationNorm = Math.sqrt(
        universalPerturbation.reduce((sum, p) => sum + p * p, 0)
      );

      examples.push({
        id: this.generateId(),
        originalInput: input,
        perturbedInput,
        perturbation: universalPerturbation,
        originalPrediction: originalClass,
        adversarialPrediction: perturbedClass,
        confidence: Math.max(...perturbedLogits) / perturbedLogits.reduce((a, b) => a + b, 0),
        perturbationNorm,
        attackType: AdversarialAttackType.UNIVERSAL,
        metadata: {
          isUniversal: true,
          method: 'UAP'
        },
        createdAt: new Date()
      });
    }

    return {
      perturbation: universalPerturbation,
      foolingRate: finalFooledCount / dataset.length,
      examples
    };
  }

  /**
   * Generate targeted universal perturbation
   */
  async generateTargeted(
    dataset: number[][],
    targetClass: number,
    getLogits: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], classIdx: number) => Promise<number[]>,
    config: AttackConfig
  ): Promise<{
    perturbation: number[];
    successRate: number;
    examples: AdversarialExample[];
  }> {
    const epsilon = config.epsilon || 0.1;
    const maxIterations = config.iterations || 10;
    const learningRate = 0.01;

    let universalPerturbation = new Array(dataset[0].length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      const batchGradients = new Array(dataset[0].length).fill(0);

      for (const input of dataset) {
        const perturbedInput = input.map((val, idx) => {
          const newVal = val + universalPerturbation[idx];
          return Math.max(0, Math.min(1, newVal));
        });

        // Get gradients toward target class
        const gradients = await getGradients(perturbedInput, targetClass);

        // Accumulate gradients
        batchGradients.forEach((_, idx) => {
          batchGradients[idx] += gradients[idx];
        });
      }

      // Average gradients and update
      universalPerturbation = universalPerturbation.map((val, idx) => {
        const avgGrad = batchGradients[idx] / dataset.length;
        return val - learningRate * avgGrad;
      });

      // Project to epsilon ball
      const norm = Math.sqrt(
        universalPerturbation.reduce((sum, p) => sum + p * p, 0)
      );
      if (norm > epsilon) {
        universalPerturbation = universalPerturbation.map(p => p * (epsilon / norm));
      }
    }

    // Evaluate success rate
    const examples: AdversarialExample[] = [];
    let successCount = 0;

    for (const input of dataset) {
      const perturbedInput = input.map((val, idx) => {
        const newVal = val + universalPerturbation[idx];
        return Math.max(0, Math.min(1, newVal));
      });

      const perturbedLogits = await getLogits(perturbedInput);
      const perturbedClass = this.argmax(perturbedLogits);

      if (perturbedClass === targetClass) {
        successCount++;
      }

      examples.push({
        id: this.generateId(),
        originalInput: input,
        perturbedInput,
        perturbation: universalPerturbation,
        originalPrediction: 0,
        adversarialPrediction: perturbedClass,
        confidence: 0,
        perturbationNorm: Math.sqrt(
          universalPerturbation.reduce((sum, p) => sum + p * p, 0)
        ),
        attackType: AdversarialAttackType.UNIVERSAL,
        metadata: {
          isUniversal: true,
          targetClass,
          method: 'UAP-Targeted'
        },
        createdAt: new Date()
      });
    }

    return {
      perturbation: universalPerturbation,
      successRate: successCount / dataset.length,
      examples
    };
  }

  private async computeMinimalPerturbation(
    input: number[],
    getLogits: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], classIdx: number) => Promise<number[]>,
    currentClass: number
  ): Promise<number[]> {
    const logits = await getLogits(input);
    const w: number[][] = [];
    const f: number[] = [];

    for (let k = 0; k < logits.length; k++) {
      if (k === currentClass) continue;

      const gradCurrent = await getGradients(input, currentClass);
      const gradK = await getGradients(input, k);

      const wk = gradCurrent.map((g, idx) => g - gradK[idx]);
      w.push(wk);
      f.push(logits[currentClass] - logits[k]);
    }

    // Find minimal perturbation
    let minDistance = Infinity;
    let minPerturbation: number[] = new Array(input.length).fill(0);

    for (let i = 0; i < w.length; i++) {
      const wNorm = Math.sqrt(w[i].reduce((sum, wi) => sum + wi * wi, 0));
      const distance = Math.abs(f[i]) / wNorm;

      if (distance < minDistance) {
        minDistance = distance;
        const normSquared = wNorm * wNorm;
        minPerturbation = w[i].map(wi => (f[i] / normSquared) * wi);
      }
    }

    return minPerturbation;
  }

  private argmax(array: number[]): number {
    return array.indexOf(Math.max(...array));
  }

  private generateId(): string {
    return `uap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
