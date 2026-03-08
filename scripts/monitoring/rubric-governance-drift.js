"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RubricDriftDetector = void 0;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
class RubricDriftDetector {
    static detect(reportPath, threshold = 0.05) {
        if (!fs_1.default.existsSync(reportPath)) {
            console.log(`Report not found: ${reportPath}`);
            return null;
        }
        const report = JSON.parse(fs_1.default.readFileSync(reportPath, 'utf8'));
        const totalCases = report.items?.length || 0;
        // Deterministic mock drift detection logic avoiding Math.random()
        const alignmentDrop = (totalCases % 10) * 0.01;
        const surfaceBiasFailureRate = (totalCases % 5) * 0.02;
        const driftMetric = {
            alignmentDrop,
            surfaceBiasFailureRate,
        };
        const alert = driftMetric.alignmentDrop > threshold;
        const result = {
            driftMetric,
            alert,
            stamp: crypto_1.default.createHash('sha256').update(JSON.stringify(driftMetric)).digest('hex')
        };
        return result;
    }
}
exports.RubricDriftDetector = RubricDriftDetector;
