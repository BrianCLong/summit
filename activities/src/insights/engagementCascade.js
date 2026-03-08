"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.engagementCascade = engagementCascade;
const torch_1 = __importDefault(require("torch"));
function engagementCascade(config) {
    const cascade = torch_1.default.recursive({ scale: config.globalImpact });
    return { cascade: `Engagement cascade at ${config.globalImpact} scale` };
}
