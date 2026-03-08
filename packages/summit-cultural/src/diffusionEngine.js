"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNarrativeDiffusionMap = buildNarrativeDiffusionMap;
const narrativeCompatibility_js_1 = require("./narrativeCompatibility.js");
function buildNarrativeDiffusionMap({ populations, narrative, signal, demographicSusceptibility = {}, }) {
    return populations
        .map((population) => {
        const compatibility = (0, narrativeCompatibility_js_1.scoreNarrativeCompatibility)(population, narrative, signal);
        const susceptibility = demographicSusceptibility[population.id] ?? 0.5;
        const adoptionLikelihood = Number(Math.min(1, compatibility.score * 0.7 + susceptibility * 0.3).toFixed(3));
        return {
            populationId: population.id,
            adoptionLikelihood,
            confidence: Number((0.5 + compatibility.score / 2).toFixed(3)),
        };
    })
        .sort((a, b) => b.adoptionLikelihood - a.adoptionLikelihood);
}
