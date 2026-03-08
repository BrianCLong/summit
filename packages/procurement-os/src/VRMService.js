"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VRMService = void 0;
const date_fns_1 = require("date-fns");
class VRMService {
    assessments = new Map();
    startAssessment(vendor, tier, assessmentType) {
        const exitPlanReady = tier <= 1;
        const assessment = {
            vendor,
            tier,
            assessmentType,
            evidences: [],
            remediation: [],
            completed: false,
            lastReviewed: new Date(),
            exitPlanReady,
            subprocessorChanges: [],
        };
        this.assessments.set(vendor, assessment);
        return assessment;
    }
    addEvidence(vendor, evidence) {
        const assessment = this.getAssessment(vendor);
        assessment.evidences.push(evidence);
        assessment.lastReviewed = new Date();
    }
    addRemediation(vendor, task) {
        const assessment = this.getAssessment(vendor);
        const remediation = { ...task, status: 'open', escalationLevel: 0 };
        assessment.remediation.push(remediation);
        return remediation;
    }
    escalateOverdueRemediations(today = new Date()) {
        const escalated = [];
        this.assessments.forEach((assessment) => {
            assessment.remediation.forEach((task) => {
                if (task.status !== 'closed' && (0, date_fns_1.isAfter)(today, task.dueDate)) {
                    task.escalationLevel += 1;
                    task.status = 'in_progress';
                    escalated.push(task);
                }
            });
        });
        return escalated;
    }
    markCompleted(vendor) {
        const assessment = this.getAssessment(vendor);
        const hasOpenHighSeverity = assessment.remediation.some((task) => task.status !== 'closed' && task.severity === 'high');
        if (hasOpenHighSeverity) {
            throw new Error('Cannot complete VRM with open high-severity remediation');
        }
        assessment.completed = true;
        assessment.lastReviewed = new Date();
    }
    requireReassessment(vendor, incidentDate) {
        const assessment = this.getAssessment(vendor);
        assessment.completed = false;
        assessment.lastReviewed = incidentDate;
    }
    needsAnnualReassessment(vendor, referenceDate = new Date()) {
        const assessment = this.getAssessment(vendor);
        const reviewBy = (0, date_fns_1.addDays)(assessment.lastReviewed, 365);
        return assessment.tier <= 1 && (0, date_fns_1.isAfter)(referenceDate, reviewBy);
    }
    recordSubprocessorChange(vendor, change) {
        const assessment = this.getAssessment(vendor);
        assessment.subprocessorChanges.push(change);
    }
    getAssessment(vendor) {
        const assessment = this.assessments.get(vendor);
        if (!assessment) {
            throw new Error(`No assessment found for vendor ${vendor}`);
        }
        return assessment;
    }
}
exports.VRMService = VRMService;
