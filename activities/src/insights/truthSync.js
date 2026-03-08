"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.truthSync = truthSync;
const sentence_transformers_1 = __importDefault(require("sentence-transformers"));
function truthSync(config) {
    const validation = sentence_transformers_1.default.validate({
        integrity: config.integrityThreshold,
    });
    return {
        sync: `Narrative validation with ${config.integrityThreshold} integrity`,
    };
}
