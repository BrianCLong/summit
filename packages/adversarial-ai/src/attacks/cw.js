"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarliniWagnerAttack = void 0;
const types_js_1 = require("../types.js");
/**
 * Carlini & Wagner (C&W) Attack
 *
 * Optimization-based attack that minimizes perturbation while ensuring
 * misclassification. Considered one of the most powerful attacks.
 */
class CarliniWagnerAttack {
    /**
     * C&W L2 attack
     */
    async generateL2(input, getLoss, getGradients, config) {
        const iterations = config.iterations || 1000;
        const confidence = config.confidence || 0;
        const learningRate = 0.01;
        const c = 1.0; // Regularization constant
        // Initialize perturbation in tanh space for box constraints
        let w = input.map(x => this.inverseTagnh(x));
        let bestPerturbation = [];
        let bestDistance = Infinity;
        let bestAdversarial = [];
        for (let iter = 0; iter < iterations; iter++) {
            // Convert from tanh space to input space
            const perturbedInput = w.map(wi => this.tanh(wi));
            // Calculate loss and gradients
            const loss = await getLoss(perturbedInput, config.targetClass);
            const gradients = await getGradients(perturbedInput);
            // Calculate L2 distance
            const perturbation = perturbedInput.map((val, idx) => val - input[idx]);
            const l2Distance = Math.sqrt(perturbation.reduce((sum, p) => sum + p * p, 0));
            // Update if better adversarial found
            if (loss > confidence && l2Distance < bestDistance) {
                bestDistance = l2Distance;
                bestPerturbation = [...perturbation];
                bestAdversarial = [...perturbedInput];
            }
            // Gradient descent in w space
            w = w.map((wi, idx) => {
                const tanhDerivative = 1 - Math.pow(this.tanh(wi), 2);
                const gradient = gradients[idx] * tanhDerivative;
                return wi - learningRate * (c * gradient + 2 * perturbation[idx]);
            });
        }
        return {
            id: this.generateId(),
            originalInput: input,
            perturbedInput: bestAdversarial.length > 0 ? bestAdversarial : input,
            perturbation: bestPerturbation.length > 0 ? bestPerturbation : new Array(input.length).fill(0),
            originalPrediction: 0,
            adversarialPrediction: 0,
            confidence: 0,
            perturbationNorm: bestDistance,
            attackType: types_js_1.AdversarialAttackType.CW,
            metadata: {
                iterations,
                confidenceParameter: confidence,
                c,
                norm: 'L2',
                method: 'C&W-L2',
                converged: bestDistance < Infinity
            },
            createdAt: new Date()
        };
    }
    /**
     * C&W L-infinity attack
     */
    async generateLInf(input, getLoss, getGradients, config) {
        const iterations = config.iterations || 1000;
        const confidence = config.confidence || 0;
        const learningRate = 0.01;
        let perturbedInput = [...input];
        const perturbation = new Array(input.length).fill(0);
        let bestPerturbation = [];
        let bestLInfNorm = Infinity;
        let bestAdversarial = [];
        for (let iter = 0; iter < iterations; iter++) {
            const loss = await getLoss(perturbedInput, config.targetClass);
            const gradients = await getGradients(perturbedInput);
            // Update perturbation
            perturbedInput = perturbedInput.map((val, idx) => {
                const newVal = val - learningRate * gradients[idx];
                perturbation[idx] = newVal - input[idx];
                return Math.max(0, Math.min(1, newVal));
            });
            // Calculate L-infinity norm
            const lInfNorm = Math.max(...perturbation.map(Math.abs));
            // Update if better adversarial found
            if (loss > confidence && lInfNorm < bestLInfNorm) {
                bestLInfNorm = lInfNorm;
                bestPerturbation = [...perturbation];
                bestAdversarial = [...perturbedInput];
            }
        }
        return {
            id: this.generateId(),
            originalInput: input,
            perturbedInput: bestAdversarial.length > 0 ? bestAdversarial : input,
            perturbation: bestPerturbation.length > 0 ? bestPerturbation : new Array(input.length).fill(0),
            originalPrediction: 0,
            adversarialPrediction: 0,
            confidence: 0,
            perturbationNorm: bestLInfNorm,
            attackType: types_js_1.AdversarialAttackType.CW,
            metadata: {
                iterations,
                confidenceParameter: confidence,
                norm: 'L-inf',
                method: 'C&W-LInf',
                converged: bestLInfNorm < Infinity
            },
            createdAt: new Date()
        };
    }
    /**
     * C&W L0 attack (sparse perturbations)
     */
    async generateL0(input, getLoss, getGradients, config) {
        const iterations = config.iterations || 1000;
        const confidence = config.confidence || 0;
        // Start with all pixels modifiable
        const activePixels = new Set(input.map((_, idx) => idx));
        let perturbedInput = [...input];
        const perturbation = new Array(input.length).fill(0);
        let bestPerturbation = [];
        let bestL0Norm = Infinity;
        let bestAdversarial = [];
        // Iteratively reduce number of modified pixels
        while (activePixels.size > 0) {
            // Optimize with current active pixels
            for (let iter = 0; iter < iterations / 10; iter++) {
                const loss = await getLoss(perturbedInput, config.targetClass);
                const gradients = await getGradients(perturbedInput);
                // Update only active pixels
                perturbedInput = perturbedInput.map((val, idx) => {
                    if (!activePixels.has(idx)) {
                        return input[idx];
                    }
                    const newVal = val - 0.01 * gradients[idx];
                    perturbation[idx] = newVal - input[idx];
                    return Math.max(0, Math.min(1, newVal));
                });
                if (loss > confidence) {
                    const l0Norm = perturbation.filter(p => Math.abs(p) > 1e-6).length;
                    if (l0Norm < bestL0Norm) {
                        bestL0Norm = l0Norm;
                        bestPerturbation = [...perturbation];
                        bestAdversarial = [...perturbedInput];
                    }
                }
            }
            // Remove pixel with smallest perturbation
            let minPerturbIdx = -1;
            let minPerturb = Infinity;
            activePixels.forEach(idx => {
                if (Math.abs(perturbation[idx]) < minPerturb) {
                    minPerturb = Math.abs(perturbation[idx]);
                    minPerturbIdx = idx;
                }
            });
            if (minPerturbIdx >= 0) {
                activePixels.delete(minPerturbIdx);
                perturbedInput[minPerturbIdx] = input[minPerturbIdx];
                perturbation[minPerturbIdx] = 0;
            }
        }
        return {
            id: this.generateId(),
            originalInput: input,
            perturbedInput: bestAdversarial.length > 0 ? bestAdversarial : input,
            perturbation: bestPerturbation.length > 0 ? bestPerturbation : new Array(input.length).fill(0),
            originalPrediction: 0,
            adversarialPrediction: 0,
            confidence: 0,
            perturbationNorm: bestL0Norm,
            attackType: types_js_1.AdversarialAttackType.CW,
            metadata: {
                iterations,
                confidenceParameter: confidence,
                norm: 'L0',
                method: 'C&W-L0',
                modifiedPixels: bestL0Norm
            },
            createdAt: new Date()
        };
    }
    tanh(x) {
        return (Math.exp(2 * x) - 1) / (Math.exp(2 * x) + 1);
    }
    inverseTagnh(x) {
        // Map [0, 1] to [-inf, inf] via inverse tanh
        const clipped = Math.max(0.001, Math.min(0.999, x));
        return 0.5 * Math.log((1 + clipped) / (1 - clipped));
    }
    generateId() {
        return `cw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CarliniWagnerAttack = CarliniWagnerAttack;
