"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftGovernanceService = void 0;
const detectors_js_1 = require("./detectors.js");
class DriftGovernanceService {
    detectors;
    constructor() {
        this.detectors = [
            new detectors_js_1.ModelDriftDetector(),
            new detectors_js_1.AgentDriftDetector(),
            new detectors_js_1.RiskDriftDetector(),
            new detectors_js_1.CostDriftDetector(),
        ];
    }
    async collectDriftSignals() {
        const allSignals = [];
        for (const detector of this.detectors) {
            const signals = await detector.detect();
            allSignals.push(...signals);
        }
        return allSignals;
    }
}
exports.DriftGovernanceService = DriftGovernanceService;
