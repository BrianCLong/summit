"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quantumEcosystemSanctuary = quantumEcosystemSanctuary;
const qutip_1 = __importDefault(require("qutip"));
function quantumEcosystemSanctuary(config) {
    const sanctuary = qutip_1.default.sanctuary({ scale: config.globalImpact });
    return {
        sanctuary: `Quantum ecosystem sanctuary at ${config.globalImpact} scale`,
    };
}
