"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const WeightsVerifier_js_1 = require("../risk/WeightsVerifier.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('WeightsVerifier', () => {
    (0, globals_1.it)('verifies checksum', () => {
        const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
        const models = path_1.default.join(__dirname, '..', '..', 'models');
        const weightsPath = path_1.default.join(models, 'weights.json');
        const checksums = JSON.parse(fs_1.default.readFileSync(path_1.default.join(models, 'checksums.json'), 'utf8'));
        const data = (0, WeightsVerifier_js_1.verifyWeights)(weightsPath, checksums['weights.json']);
        (0, globals_1.expect)(data).toHaveProperty('bias');
    });
});
