"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FGSMAttack = void 0;
const types_js_1 = require("../types.js");
/**
 * Fast Gradient Sign Method (FGSM) Attack
 *
 * Generates adversarial examples by adding small perturbations in the direction
 * of the gradient of the loss function.
 */
class FGSMAttack {
    /**
     * Generate adversarial example using FGSM
     */
    async generate(input, gradients, config) {
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
            attackType: types_js_1.AdversarialAttackType.FGSM,
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
    async generateTargeted(input, gradients, targetClass, config) {
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
            attackType: types_js_1.AdversarialAttackType.FGSM,
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
    async generateIterative(input, getGradients, config) {
        const epsilon = config.epsilon || 0.03;
        const iterations = config.iterations || 10;
        const stepSize = config.stepSize || epsilon / iterations;
        let perturbedInput = [...input];
        const totalPerturbation = new Array(input.length).fill(0);
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
            attackType: types_js_1.AdversarialAttackType.FGSM,
            metadata: {
                epsilon,
                iterations,
                stepSize,
                method: 'I-FGSM'
            },
            createdAt: new Date()
        };
    }
    generateId() {
        return `fgsm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.FGSMAttack = FGSMAttack;
