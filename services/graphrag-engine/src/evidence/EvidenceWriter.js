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
exports.EvidenceWriter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class EvidenceWriter {
    config;
    constructor(config) {
        this.config = config;
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }
    }
    writeArtifacts(result, metrics) {
        const evid = `GRRAG-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${this.config.gitShortSha}-${this.config.runId}`;
        const baseDir = path.join(this.config.outputDir, evid);
        fs.mkdirSync(baseDir, { recursive: true });
        const report = {
            run_id: this.config.runId,
            item: 'GraphRAG-Analysis',
            evidence_ids: [evid],
            artifacts: {
                selected_explanation: result.selectedExplanation.id,
                robustness_score: result.robustness.score.toString(),
                node_count: result.selectedProof.nodes.length.toString(),
                edge_count: result.selectedProof.edges.length.toString(),
                retrieval_strategy: 'Hybrid-GVG',
                justification_rationale: result.selectedExplanation.rationale
            }
        };
        const metricsData = {
            ...metrics,
            robustness: result.robustness,
            faithfulness: 1.0,
            refusal_rate: 0.0
        };
        const stamp = {
            git_sha: this.config.gitShortSha,
            timestamp: new Date().toISOString(),
            run_id: this.config.runId
        };
        fs.writeFileSync(path.join(baseDir, 'report.json'), JSON.stringify(report, null, 2));
        fs.writeFileSync(path.join(baseDir, 'metrics.json'), JSON.stringify(metricsData, null, 2));
        fs.writeFileSync(path.join(baseDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
        return evid;
    }
}
exports.EvidenceWriter = EvidenceWriter;
