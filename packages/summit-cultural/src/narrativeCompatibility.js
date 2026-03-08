"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreNarrativeCompatibility = scoreNarrativeCompatibility;
const WEIGHTS = {
    valueAlignment: 0.35,
    linguisticAuthenticity: 0.3,
    historicalResonance: 0.2,
    mediaDistributionFit: 0.15,
};
function overlapRatio(a = [], b = []) {
    if (!a.length || !b.length) {
        return 0;
    }
    const aNorm = new Set(a.map((item) => item.toLowerCase()));
    const bNorm = new Set(b.map((item) => item.toLowerCase()));
    let shared = 0;
    for (const value of aNorm) {
        if (bNorm.has(value)) {
            shared += 1;
        }
    }
    return shared / Math.max(aNorm.size, bNorm.size);
}
function scoreNarrativeCompatibility(population, narrative, signal) {
    const valueAlignment = overlapRatio(population.valueSignals, narrative.frameValues);
    const languageFit = population.languages.includes(signal.sourceLanguage) ||
        narrative.targetLanguages.includes(signal.sourceLanguage)
        ? 1
        : 0.2;
    const registerPenalty = signal.suspectedTranslation ? 0.2 : 0;
    const linguisticAuthenticity = Math.max(0, languageFit - registerPenalty);
    const historicalResonance = overlapRatio(population.historicalMemories, narrative.historicalReferences);
    const mediaDistributionFit = overlapRatio(population.mediaConsumption, narrative.mediaVectors);
    const breakdown = {
        valueAlignment,
        linguisticAuthenticity,
        historicalResonance,
        mediaDistributionFit,
    };
    const score = Object.entries(breakdown).reduce((acc, [metric, value]) => {
        return acc + value * WEIGHTS[metric];
    }, 0);
    return {
        score: Number(score.toFixed(3)),
        breakdown,
    };
}
