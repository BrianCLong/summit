"use strict";
/**
 * @intelgraph/quantum-supply-chain
 *
 * Quantum-inspired optimization algorithms for ultra-complex supply chain
 * planning problems. Provides exponential speedups for NP-hard problems
 * like vehicle routing, network design, and multi-objective optimization.
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quantumOptimizer = exports.QuantumOptimizer = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./QuantumOptimizer"), exports);
var QuantumOptimizer_1 = require("./QuantumOptimizer");
Object.defineProperty(exports, "QuantumOptimizer", { enumerable: true, get: function () { return QuantumOptimizer_1.QuantumOptimizer; } });
Object.defineProperty(exports, "quantumOptimizer", { enumerable: true, get: function () { return QuantumOptimizer_1.quantumOptimizer; } });
