"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskMitigator = riskMitigator;
const statsmodels_1 = __importDefault(require("statsmodels"));
function riskMitigator(config) {
    const risk = statsmodels_1.default.forecast({ integrity: config.integrityThreshold });
    return { mitigation: `Risk at ${risk}%` };
}
