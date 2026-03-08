"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvidence = emitEvidence;
const fs_1 = require("fs");
const path_1 = require("path");
function emitEvidence(baseDir, items, metrics) {
    const agentTraceDir = (0, path_1.join)(baseDir, 'evidence/agent_trace');
    (0, fs_1.mkdirSync)(agentTraceDir, { recursive: true });
    // Report
    const report = {
        evidence_id: 'EVD-AGENTTRACE-REPORT',
        summary: 'Agent Trace validation and policy report',
        artifacts: items.flatMap(i => i.artifacts),
        items
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(agentTraceDir, 'report.json'), JSON.stringify(report, null, 2));
    // Metrics
    (0, fs_1.writeFileSync)((0, path_1.join)(agentTraceDir, 'metrics.json'), JSON.stringify({ metrics }, null, 2));
    // Stamp
    const stamp = {
        timestamp: new Date().toISOString(),
        version: '0.1.0'
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(agentTraceDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
    // Index
    const index = {
        items: [
            { evidence_id: 'EVD-AGENTTRACE-REPORT', path: 'evidence/agent_trace/report.json' },
            { evidence_id: 'EVD-AGENTTRACE-METRICS', path: 'evidence/agent_trace/metrics.json' },
            { evidence_id: 'EVD-AGENTTRACE-STAMP', path: 'evidence/agent_trace/stamp.json' }
        ]
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(agentTraceDir, 'index.json'), JSON.stringify(index, null, 2));
}
