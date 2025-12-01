import { AdversarialExample, AttackConfig, AdversarialAttackType } from '../types';

/**
 * Fast Gradient Sign Method (FGSM) Attack
 *
 * Generates adversarial examples by adding small perturbations in the direction
 * of the gradient of the loss function.
 */
export class FGSMAttack {
  /**
   * Generate adversarial example using FGSM
   */
  async generate(
    input: number[],
    gradients: number[],
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.03;

    // Calculate perturbation: epsilon * sign(gradient)
    const perturbation = gradients.map(g => epsilon * Math.sign(g));

    // Apply perturbation
    const perturbedInput = input.map((val, idx) => {
      const perturbed = val + perturbation[idx];
      // Clip to valid range [0, 1]
      return Math.max(0, Math.min(1, perturbed));
    });

    // Calculate L-infinity norm of perturbation
    const perturbationNorm = Math.max(...perturbation.map(Math.abs));

    return {
      id: this.generateId(),
      originalInput: input,
      perturbedInput,
      perturbation,
      originalPrediction: 0, // To be filled by caller
      adversarialPrediction: 0, // To be filled by caller
      confidence: 0,
      perturbationNorm,
      attackType: AdversarialAttackType.FGSM,
      metadata: {
        epsilon,
        method: 'FGSM'
      },
      createdAt: new Date()
    };
  }

  /**
   * Generate targeted FGSM attack
   */
  async generateTargeted(
    input: number[],
    gradients: number[],
    targetClass: number,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.03;

    // For targeted attack, move in opposite direction of gradient
    const perturbation = gradients.map(g => -epsilon * Math.sign(g));

    const perturbedInput = input.map((val, idx) => {
      const perturbed = val + perturbation[idx];
      return Math.max(0, Math.min(1, perturbed));
    });

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
      attackType: AdversarialAttackType.FGSM,
      metadata: {
        epsilon,
        targetClass,
        method: 'FGSM-Targeted'
      },
      createdAt: new Date()
    };
  }

  /**
   * Iterative FGSM (I-FGSM / BIM)
   */
  async generateIterative(
    input: number[],
    getGradients: (input: number[]) => Promise<number[]>,
    config: AttackConfig
  ): Promise<AdversarialExample> {
    const epsilon = config.epsilon || 0.03;
    const iterations = config.iterations || 10;
    const stepSize = config.stepSize || epsilon / iterations;

    let perturbedInput = [...input];
    const totalPerturbation: number[] = new Array(input.length).fill(0);

    for (let i = 0; i < iterations; i++) {
      const gradients = await getGradients(perturbedInput);

      // Apply small step in gradient direction
      const step = gradients.map(g => stepSize * Math.sign(g));

      // Update perturbed input
      perturbedInput = perturbedInput.map((val, idx) => {
        const newVal = val + step[idx];
        totalPerturbation[idx] += step[idx];

        // Clip to epsilon ball around original input
        const maxVal = Math.min(1, input[idx] + epsilon);
        const minVal = Math.max(0, input[idx] - epsilon);
        return Math.max(minVal, Math.min(maxVal, newVal));
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
      attackType: AdversarialAttackType.FGSM,
      metadata: {
        epsilon,
        iterations,
        stepSize,
        method: 'I-FGSM'
      },
      createdAt: new Date()
    };
  }

  private generateId(): string {
    return `fgsm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
