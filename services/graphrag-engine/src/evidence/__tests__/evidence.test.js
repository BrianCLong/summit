"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const EvidenceWriter_js_1 = require("../EvidenceWriter.js");
describe('EvidenceWriter', () => {
    const outputDir = 'test-evidence-output';
    afterEach(() => {
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true });
        }
    });
    test('should write deterministic artifacts', () => {
        const writer = new EvidenceWriter_js_1.EvidenceWriter({
            outputDir,
            runId: 'test-run',
            gitShortSha: 'abc1234'
        });
        const mockResult = {
            selectedExplanation: { id: 'c1', seedEntities: [], discoverySubgraphRef: 'r', rationale: '' },
            selectedProof: { nodes: [], edges: [] },
            robustness: { score: 0.8, pathMultiplicity: 1, evidenceDiversity: 1, stability: 1, minimality: 1 },
            rejectedExplanations: []
        };
        const evid = writer.writeArtifacts(mockResult, { latency: 100 });
        const evidDir = path.join(outputDir, evid);
        expect(fs.existsSync(path.join(evidDir, 'report.json'))).toBe(true);
        expect(fs.existsSync(path.join(evidDir, 'metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(evidDir, 'stamp.json'))).toBe(true);
        const report = JSON.parse(fs.readFileSync(path.join(evidDir, 'report.json'), 'utf8'));
        expect(report.run_id).toBe('test-run');
    });
});
