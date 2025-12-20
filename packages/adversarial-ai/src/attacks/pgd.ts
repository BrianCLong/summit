import { AdversarialExample, AttackConfig, AdversarialAttackType } from '../types';

/**
 * Projected Gradient Descent (PGD) Attack
 *
 * Multi-step variant of FGSM that is considered one of the strongest
 * first-order adversarial attacks.
 */
export class PGDAttack {
  /**
   * Generate adversarial example using PGD
   */
  async generate(
    input: number[],
    getGradients: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.03;
    const iterations = config.iterations || 40;
    const stepSize = config.stepSize || epsilon / 10;

    // Random initialization within epsilon ball
    let perturbedInput = input.map(val => {
      const noise = (Math.random() * 2 - 1) * epsilon;
      return Math.max(0, Math.min(1, val + noise));
    });

    const totalPerturbation: number[] = perturbedInput.map((val, idx) => val - input[idx]);

    for (let i = 0; i < iterations; i++) {
      const gradients = await getGradients(perturbedInput);

      // Gradient ascent step
      perturbedInput = perturbedInput.map((val, idx) => {
        return val + stepSize * Math.sign(gradients[idx]);
      });

      // Project back to epsilon ball
      perturbedInput = perturbedInput.map((val, idx) => {
        const delta = val - input[idx];
        const clippedDelta = Math.max(-epsilon, Math.min(epsilon, delta));
        totalPerturbation[idx] = clippedDelta;

        // Clip to valid input range
        return Math.max(0, Math.min(1, input[idx] + clippedDelta));
      });
    }

    const perturbationNorm = Math.max(...totalPerturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation: totalPerturbation,
      originalPrediction: 0,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.PGD,
      metadata: {
        epsilon,
        iterations,
        stepSize,
        method: 'PGD',
        initialization: 'random'
      },
      createdAt: new Date()
    };
  }

  /**
   * Targeted PGD attack
   */
  async generateTargeted(
    input: number[],
    getGradients: (input: number[], targetClass: number) => Promise<number[]>,
    targetClass: number,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.03;
    const iterations = config.iterations || 40;
    const stepSize = config.stepSize || epsilon / 10;

    let perturbedInput = input.map(val => {
      const noise = (Math.random() * 2 - 1) * epsilon;
      return Math.max(0, Math.min(1, val + noise));
    });

    const totalPerturbation: number[] = perturbedInput.map((val, idx) => val - input[idx]);

    for (let i = 0; i < iterations; i++) {
      const gradients = await getGradients(perturbedInput, targetClass);

      // Gradient descent for targeted attack (move toward target)
      perturbedInput = perturbedInput.map((val, idx) => {
        return val - stepSize * Math.sign(gradients[idx]);
      });

      // Project back to epsilon ball
      perturbedInput = perturbedInput.map((val, idx) => {
        const delta = val - input[idx];
        const clippedDelta = Math.max(-epsilon, Math.min(epsilon, delta));
        totalPerturbation[idx] = clippedDelta;
        return Math.max(0, Math.min(1, input[idx] + clippedDelta));
      });
    }

    const perturbationNorm = Math.max(...totalPerturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation: totalPerturbation,
      originalPrediction: 0,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.PGD,
      metadata: {
        epsilon,
        iterations,
        stepSize,
        targetClass,
        method: 'PGD-Targeted'
      },
      createdAt: new Date()
    };
  }

  /**
   * PGD with L2 norm constraint
   */
  async generateL2(
    input: number[],
    getGradients: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 1.0;
    const iterations = config.iterations || 40;
    const stepSize = config.stepSize || epsilon / 10;

    let perturbedInput = [...input];
    const totalPerturbation: number[] = new Array(input.length).fill(0);

    for (let i = 0; i < iterations; i++) {
      const gradients = await getGradients(perturbedInput);

      // Gradient step
      perturbedInput = perturbedInput.map((val, idx) => {
        return val + stepSize * gradients[idx];
      });

      // Project to L2 ball
      const currentPerturbation = perturbedInput.map((val, idx) => val - input[idx]);
      const l2Norm = Math.sqrt(
        currentPerturbation.reduce((sum, p) => sum + p * p, 0)
      );

      if (l2Norm > epsilon) {
        perturbedInput = perturbedInput.map((val, idx) => {
          const scaled = (val - input[idx]) * (epsilon / l2Norm);
          totalPerturbation[idx] = scaled;
          return Math.max(0, Math.min(1, input[idx] + scaled));
        });
      } else {
        totalPerturbation.forEach((_, idx) => {
          totalPerturbation[idx] = perturbedInput[idx] - input[idx];
        });
      }
    }

    const perturbationNorm = Math.sqrt(
      totalPerturbation.reduce((sum, p) => sum + p * p, 0)
    );

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation: totalPerturbation,
      originalPrediction: 0,
      adversarialPrediction: 0,
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.PGD,
      metadata: {
        epsilon,
        iterations,
        stepSize,
        norm: 'L2',
        method: 'PGD-L2'
      },
      createdAt: new Date()
    };
  }

  private generateId(): string {
    return `pgd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
