"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectionOrchestrator = void 0;
class InjectionOrchestrator {
    prepareContext(bundles, fusedBeliefs, proposals) {
        // Sort bundles by ranking
        const sortedBundles = bundles.sort((a, b) => (b.probability * b.utility) - (a.probability * a.utility));
        // Limit to top K
        const topK = sortedBundles.slice(0, 5);
        return {
            foresight: topK,
            beliefs: fusedBeliefs,
            proposals: proposals,
            probes: this.generateProbes(topK)
        };
    }
    generateProbes(bundles) {
        if (bundles.length === 0)
            return ["Acquire basics"];
        return bundles.map(b => `Verify precondition for ${b.contextParams.predictedState}`);
    }
}
exports.InjectionOrchestrator = InjectionOrchestrator;
