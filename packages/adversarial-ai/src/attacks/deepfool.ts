import { AdversarialExample, AttackConfig, AdversarialAttackType } from '../types';

/**
 * DeepFool Attack
 *
 * Finds minimal perturbation to cross decision boundary by iteratively
 * linearizing the classifier and finding the closest decision boundary.
 */
export class DeepFoolAttack {
  /**
   * Generate adversarial example using DeepFool
   */
  async generate(
    input: number[],
    getLogits: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], classIdx: number) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const maxIterations = config.iterations || 50;
    const overshoot = 0.02; // Small overshoot to ensure crossing boundary

    let perturbedInput = [...input];
    const totalPerturbation: number[] = new Array(input.length).fill(0);

    // Get initial prediction
    let logits = await getLogits(perturbedInput);
    let currentClass = this.argmax(logits);
    const originalClass = currentClass;

    let iter = 0;
    while (currentClass === originalClass && iter < maxIterations) {
      // Find the closest class to current prediction
      const w: number[][] = [];
      const f: number[] = [];

      for (let k = 0; k < logits.length; k++) {
        if (k === currentClass) continue;

        // Get gradients for current class and class k
        const gradCurrent = await getGradients(perturbedInput, currentClass);
        const gradK = await getGradients(perturbedInput, k);

        // w_k = gradient difference
        const wk = gradCurrent.map((g, idx) => g - gradK[idx]);
        w.push(wk);

        // f_k = logit difference
        f.push(logits[currentClass] - logits[k]);
      }

      // Find minimal perturbation
      let minDistance = Infinity;
      let minPerturbation: number[] = [];

      for (let i = 0; i < w.length; i++) {
        const wNorm = Math.sqrt(w[i].reduce((sum, wi) => sum + wi * wi, 0));
        const distance = Math.abs(f[i]) / wNorm;

        if (distance < minDistance) {
          minDistance = distance;
          // Perturbation: r = (f / ||w||^2) * w
          const normSquared = wNorm * wNorm;
          minPerturbation = w[i].map(wi => (f[i] / normSquared) * wi * (1 + overshoot));
        }
      }

      // Apply perturbation
      perturbedInput = perturbedInput.map((val, idx) => {
        const newVal = val + minPerturbation[idx];
        totalPerturbation[idx] += minPerturbation[idx];
        return Math.max(0, Math.min(1, newVal));
      });

      // Update logits and current class
      logits = await getLogits(perturbedInput);
      currentClass = this.argmax(logits);

      iter++;
    }

    const perturbationNorm = Math.sqrt(
      totalPerturbation.reduce((sum, p) => sum + p * p, 0)
    );

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation: totalPerturbation,
      originalPrediction: originalClass,
      adversarialPrediction: currentClass,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.DEEPFOOL,
      metadata: {
        iterations: iter,
        overshoot,
        method: 'DeepFool',
        boundaryDistance: perturbationNorm
      },
      createdAt: new Date()
    };
  }

  /**
   * L-infinity variant of DeepFool
   */
  async generateLInf(
    input: number[],
    getLogits: (input: number[]) => Promise<number[]>,
    getGradients: (input: number[], classIdx: number) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const maxIterations = config.iterations || 50;
    const overshoot = 0.02;

    let perturbedInput = [...input];
    const totalPerturbation: number[] = new Array(input.length).fill(0);

    let logits = await getLogits(perturbedInput);
    let currentClass = this.argmax(logits);
    const originalClass = currentClass;

    let iter = 0;
    while (currentClass === originalClass && iter < maxIterations) {
      const w: number[][] = [];
      const f: number[] = [];

      for (let k = 0; k < logits.length; k++) {
        if (k === originalClass) continue;

        const gradCurrent = await getGradients(perturbedInput, currentClass);
        const gradK = await getGradients(perturbedInput, k);

        const wk = gradCurrent.map((g, idx) => g - gradK[idx]);
        w.push(wk);
        f.push(logits[currentClass] - logits[k]);
      }

      // Find minimal L-infinity perturbation
      let minLInfDistance = Infinity;
      let minPerturbation: number[] = [];

      for (let i = 0; i < w.length; i++) {
        const lInfNorm = Math.max(...w[i].map(Math.abs));
        const distance = Math.abs(f[i]) / lInfNorm;

        if (distance < minLInfDistance) {
          minLInfDistance = distance;
          // L-inf perturbation: sign of gradient weighted by distance
          minPerturbation = w[i].map(wi =>
            (f[i] / lInfNorm) * Math.sign(wi) * (1 + overshoot)
          );
        }
      }

      perturbedInput = perturbedInput.map((val, idx) => {
        const newVal = val + minPerturbation[idx];
        totalPerturbation[idx] += minPerturbation[idx];
        return Math.max(0, Math.min(1, newVal));
      });

      logits = await getLogits(perturbedInput);
      currentClass = this.argmax(logits);
      iter++;
    }

    const perturbationNorm = Math.max(...totalPerturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation: totalPerturbation,
      originalPrediction: originalClass,
      adversarialPrediction: currentClass,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.DEEPFOOL,
      metadata: {
        iterations: iter,
        overshoot,
        norm: 'L-inf',
        method: 'DeepFool-LInf'
      },
      createdAt: new Date()
    };
  }

  private argmax(array: number[]): number {
    return array.indexOf(Math.max(...array));
  }

  private generateId(): string {
    return `deepfool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
