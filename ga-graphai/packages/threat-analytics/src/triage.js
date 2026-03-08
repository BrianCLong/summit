"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageEngine = void 0;
class TriageEngine {
    plan(score) {
        const actions = [];
        if (score.severity === 'critical' || score.severity === 'high') {
            actions.push({ type: 'isolate', reason: 'High risk score' });
            actions.push({ type: 'block-indicator', reason: 'Containment of IOC spread' });
            actions.push({ type: 'collect-forensics', reason: 'Preserve evidence for IR' });
        }
        else if (score.severity === 'medium') {
            actions.push({ type: 'investigate', reason: 'Potential malicious activity' });
            actions.push({ type: 'watch', reason: 'Track behavior drift' });
        }
        else if (score.severity === 'low') {
            actions.push({ type: 'watch', reason: 'Low confidence anomaly' });
        }
        actions.push({ type: 'open-ticket', reason: 'Track case lifecycle', owner: 'threat-hunting' });
        return {
            entityId: score.entityId,
            severity: score.severity,
            actions,
        };
    }
}
exports.TriageEngine = TriageEngine;
