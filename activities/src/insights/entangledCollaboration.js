"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.entangledCollaboration = entangledCollaboration;
const sympy_1 = __importDefault(require("sympy"));
const qutip_1 = __importDefault(require("qutip"));
function entangledCollaboration(config) {
    const collaboration = sympy_1.default.polymorphic(qutip_1.default.entangle({ precision: config.opportunityPrecision }));
    return {
        collaboration: `Quantum-entangled collaboration at ${config.opportunityPrecision} precision`,
    };
}
