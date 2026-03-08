"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentEngine = void 0;
class ExperimentEngine {
    experiments = new Map();
    lastSelection = new Map();
    register(definition) {
        this.experiments.set(definition.name, definition);
    }
    select(experimentName) {
        if (!experimentName) {
            return undefined;
        }
        const experiment = this.experiments.get(experimentName);
        if (!experiment) {
            throw new Error(`Experiment ${experimentName} is not registered`);
        }
        const roll = Math.random();
        let cumulative = experiment.controlVariant.probability;
        if (roll < cumulative) {
            this.lastSelection.set(experimentName, experiment.controlVariant);
            return experiment.controlVariant;
        }
        for (const variant of experiment.variants) {
            cumulative += variant.probability;
            if (roll < cumulative) {
                this.lastSelection.set(experimentName, variant);
                return variant;
            }
        }
        const fallback = experiment.variants[experiment.variants.length - 1] ?? experiment.controlVariant;
        this.lastSelection.set(experimentName, fallback);
        return fallback;
    }
    getLastSelection(experimentName) {
        if (!experimentName) {
            return undefined;
        }
        return this.lastSelection.get(experimentName);
    }
}
exports.ExperimentEngine = ExperimentEngine;
