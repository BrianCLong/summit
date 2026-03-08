"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeSynthesizer = narrativeSynthesizer;
const sentence_transformers_1 = __importDefault(require("sentence-transformers"));
function narrativeSynthesizer(config) {
    const narrative = sentence_transformers_1.default.generate({
        context: config.engagementAmplification,
    });
    return {
        narrative: `Tailored messaging with ${config.engagementAmplification}x amplification`,
    };
}
