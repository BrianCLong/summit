"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningStudio = planningStudio;
const statsmodels_1 = __importDefault(require("statsmodels"));
function planningStudio(config) {
    const risk = statsmodels_1.default.forecast({ risk: config.integrityThreshold });
    return { sim: `Strategy with ${risk.risk}% risk` };
}
