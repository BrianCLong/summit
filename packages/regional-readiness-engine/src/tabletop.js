"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTabletopExercises = runTabletopExercises;
function runTabletopExercises(inputs) {
    const gaps = [];
    if (!inputs.evidencePackReady) {
        gaps.push('Evidence pack cannot be produced within SLA');
    }
    if (!inputs.incidentCommsTemplatesReady) {
        gaps.push('Incident communications templates are missing for the region');
    }
    if (!inputs.failoverPlaybookTested) {
        gaps.push('Failover posture not tested or approved');
    }
    if (!inputs.dsarWorkflowAutomated) {
        gaps.push('DSAR workflow is not automated end-to-end');
    }
    if (!inputs.escalationSlaMet) {
        gaps.push('Restricted-party escalation lane does not meet SLA');
    }
    return {
        passed: gaps.length === 0,
        gaps,
    };
}
