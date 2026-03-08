"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const diffusionEngine_js_1 = require("../diffusionEngine.js");
const sampleScenario_js_1 = require("../fixtures/sampleScenario.js");
(0, node_test_1.default)('buildNarrativeDiffusionMap ranks culturally aligned populations first', () => {
    const map = (0, diffusionEngine_js_1.buildNarrativeDiffusionMap)({
        populations: sampleScenario_js_1.samplePopulations,
        narrative: sampleScenario_js_1.sampleNarrative,
        signal: sampleScenario_js_1.sampleSignal,
        demographicSusceptibility: {
            'polish-youth-urban': 0.45,
            'slovak-rural-energy-workers': 0.9,
            'nordic-urban-professionals': 0.2,
        },
    });
    strict_1.default.equal(map[0].populationId, 'slovak-rural-energy-workers');
    strict_1.default.equal(map[map.length - 1].populationId, 'nordic-urban-professionals');
    strict_1.default.ok(map[0].adoptionLikelihood > map[1].adoptionLikelihood);
});
