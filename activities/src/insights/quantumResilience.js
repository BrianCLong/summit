"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quantumResilience = quantumResilience;
function quantumResilience(config) {
    return {
        resilience: `Quantum resilience at ${config.integrityThreshold} integrity threshold`,
    };
}
