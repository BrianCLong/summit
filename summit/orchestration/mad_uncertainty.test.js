"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const mad_uncertainty_1 = require("./mad_uncertainty");
(0, node_test_1.test)('calculateEntropy should handle empty distribution', () => {
    assert.strictEqual((0, mad_uncertainty_1.calculateEntropy)({}), 0);
});
(0, node_test_1.test)('calculateEntropy should compute simple distribution', () => {
    const dist = { 'a': 0.5, 'b': 0.5 };
    assert.strictEqual((0, mad_uncertainty_1.calculateEntropy)(dist), 1);
});
(0, node_test_1.test)('calculateEntropy should ignore 0 probabilities', () => {
    const dist = { 'a': 1, 'b': 0 };
    assert.strictEqual((0, mad_uncertainty_1.calculateEntropy)(dist), 0);
});
(0, node_test_1.test)('normalizeDistribution should handle normal distribution correctly', () => {
    const dist = { 'A': 2, 'B': 2 };
    const norm = (0, mad_uncertainty_1.normalizeDistribution)(dist);
    assert.strictEqual(norm['A'], 0.5);
    assert.strictEqual(norm['B'], 0.5);
});
(0, node_test_1.test)('calculateMixtureDistribution should average distributions correctly', () => {
    const dist1 = { 'A': 1, 'B': 0 };
    const dist2 = { 'A': 0, 'B': 1 };
    const mix = (0, mad_uncertainty_1.calculateMixtureDistribution)([dist1, dist2]);
    assert.strictEqual(mix['A'], 0.5);
    assert.strictEqual(mix['B'], 0.5);
});
(0, node_test_1.test)('computeUncertaintyDecomposition for completely identical confident agents', () => {
    // Both agents are 100% confident in 'A'
    const dists = [{ 'A': 1 }, { 'A': 1 }];
    const result = (0, mad_uncertainty_1.computeUncertaintyDecomposition)(dists);
    assert.strictEqual(result.sysEu, 0); // Complete agreement -> 0 epistemic uncertainty
    assert.strictEqual(result.sysAu, 0); // Total confidence -> 0 aleatoric uncertainty
    assert.strictEqual(result.totalUncertainty, 0);
});
(0, node_test_1.test)('computeUncertaintyDecomposition for heterogeneous agents', () => {
    // Agent 1 is 100% confident in 'A', Agent 2 is 100% confident in 'B'
    const dists = [{ 'A': 1, 'B': 0 }, { 'A': 0, 'B': 1 }];
    const result = (0, mad_uncertainty_1.computeUncertaintyDecomposition)(dists);
    // Mixture is 50/50, entropy is 1. Avg entropy is 0. JSD = 1.
    assert.strictEqual(result.sysEu, 1); // High disagreement -> epistemic uncertainty
    assert.strictEqual(result.sysAu, 0); // Each is individually confident -> 0 aleatoric
    assert.strictEqual(result.totalUncertainty, 1);
});
(0, node_test_1.test)('computeUncertaintyDecomposition for uniformly unconfident agents', () => {
    // Both agents are 50/50 split
    const dists = [{ 'A': 0.5, 'B': 0.5 }, { 'A': 0.5, 'B': 0.5 }];
    const result = (0, mad_uncertainty_1.computeUncertaintyDecomposition)(dists);
    // Mixture is 50/50, entropy is 1. Avg entropy is 1. JSD = 0.
    assert.strictEqual(result.sysEu, 0); // Complete agreement -> 0 epistemic uncertainty
    assert.strictEqual(result.sysAu, 1); // Individually uncertain -> aleatoric uncertainty
    assert.strictEqual(result.totalUncertainty, 1);
});
