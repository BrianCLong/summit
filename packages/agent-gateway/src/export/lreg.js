"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLREG = exportLREG;
const axios_1 = __importDefault(require("axios"));
const gate_js_1 = require("../dissent/gate.js");
async function exportLREG(runId, caseId, kpwBundle, aer, policyLogs) {
    const coverage = await (0, gate_js_1.ensureCoverage)(runId, 0.7);
    const { data } = await axios_1.default.post(process.env.LREG_URL || 'http://lreg-exporter:7301/lreg/export', {
        runId,
        caseId,
        kpwBundle,
        aer,
        policyLogs,
        dissentCoverage: coverage,
    }, { responseType: 'arraybuffer' });
    return data; // zip bytes; persist to evidence store
}
