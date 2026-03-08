"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxRun = sandboxRun;
const crypto_1 = __importDefault(require("crypto"));
const translator_js_1 = require("./translator.js");
const ROW_CAP = 20;
function seedObject(label) {
    const hash = crypto_1.default.createHash('md5').update(label).digest('hex').slice(0, 6);
    return {
        label,
        id: hash,
        name: `${label}-${hash}`,
    };
}
function sandboxRun(prompt) {
    const translation = (0, translator_js_1.translate)(prompt);
    const base = seedObject(translation.cypher.match(/\((\w+):/i)?.[1] || 'Node');
    const requestedRows = Math.max(5, Math.floor(translation.confidence * 30));
    const previewRows = [];
    for (let i = 0; i < Math.min(requestedRows, ROW_CAP + 5); i += 1) {
        previewRows.push({ ...base, row: i + 1 });
    }
    const truncated = previewRows.length > ROW_CAP;
    return { previewRows: previewRows.slice(0, ROW_CAP), truncated };
}
