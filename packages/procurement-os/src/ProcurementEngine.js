"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementEngine = void 0;
const IntakeValidator_1 = require("./IntakeValidator");
const RiskTieringEngine_1 = require("./RiskTieringEngine");
const SpendGate_1 = require("./SpendGate");
const WorkflowRouter_1 = require("./WorkflowRouter");
const VRMService_1 = require("./VRMService");
const ExceptionRegistry_1 = require("./ExceptionRegistry");
const RenewalCalendar_1 = require("./RenewalCalendar");
const ScorecardService_1 = require("./ScorecardService");
class ProcurementEngine {
    validator = new IntakeValidator_1.IntakeValidator();
    tiering = new RiskTieringEngine_1.RiskTieringEngine();
    spendGate = new SpendGate_1.SpendGate();
    router = new WorkflowRouter_1.WorkflowRouter();
    vrm = new VRMService_1.VRMService();
    exceptions = new ExceptionRegistry_1.ExceptionRegistry();
    renewals = new RenewalCalendar_1.RenewalCalendar();
    scorecards = new ScorecardService_1.ScorecardService();
    catalog = new Map();
    createIntake(intake) {
        const validated = this.validator.validate(intake);
        const riskTier = this.tiering.calculateTier(validated);
        const approvalPath = this.spendGate.evaluate(validated, riskTier);
        const routing = this.router.route(validated, approvalPath, riskTier);
        const policyViolations = this.checkPolicyViolations(validated);
        if (this.tiering.isExpiringRenewal(validated)) {
            this.renewals.addEvent({
                vendor: validated.vendorName,
                renewalDate: new Date(validated.renewalDate),
                noticeDate: new Date(validated.noticeDate),
                negotiationWindowStart: new Date(new Date(validated.noticeDate).getTime() - 14 * 24 * 60 * 60 * 1000),
                owner: validated.owner,
                autoRenew: validated.termMonths >= 12,
            });
        }
        return { riskTier, approvalPath, routing, policyViolations };
    }
    startVRM(vendor, tier) {
        const assessmentType = tier === 0 ? 'deep' : tier === 1 ? 'standard' : 'lite';
        this.vrm.startAssessment(vendor, tier, assessmentType);
    }
    evaluatePayment(request) {
        if (!request.purchaseOrder) {
            if (!request.exceptionId || !this.exceptions.isValid(request.exceptionId)) {
                return { approved: false, reason: 'No PO/no pay enforced and no valid exception' };
            }
        }
        return { approved: true };
    }
    registerException(entry) {
        this.exceptions.register(entry);
    }
    addCatalogEntry(entry) {
        if (entry.keepKill === 'delete' && entry.blockedShadow === false) {
            throw new Error('Deletion candidates must block shadow vendors');
        }
        this.catalog.set(entry.vendor, entry);
    }
    enforceOverlapPolicy(newEntry) {
        if (newEntry.overlapCategory) {
            const overlapping = Array.from(this.catalog.values()).filter((entry) => entry.overlapCategory === newEntry.overlapCategory && entry.vendor !== newEntry.vendor);
            overlapping.forEach((entry) => {
                if (entry.keepKill !== 'delete') {
                    entry.keepKill = 'delete';
                    entry.blockedShadow = true;
                    this.catalog.set(entry.vendor, entry);
                }
            });
        }
        this.addCatalogEntry(newEntry);
    }
    buildScorecard(vendor, metrics) {
        return this.scorecards.buildScorecard(vendor, metrics);
    }
    getRenewalsDue(days) {
        return this.renewals.dueWithin(days);
    }
    getNegotiationWindows() {
        return this.renewals.negotiationWindows();
    }
    getVRMService() {
        return this.vrm;
    }
    checkPolicyViolations(intake) {
        const violations = [];
        if (!intake.hasSSO) {
            violations.push('SSO missing; must be configured before go-live');
        }
        if (!intake.preferredVendor) {
            violations.push('Non-preferred vendor requires approved exception');
        }
        if (intake.existingOverlapCategory) {
            violations.push('Overlapping category requires decommissioning plan');
        }
        if (intake.seatsRequested > intake.estimatedUsers) {
            violations.push('Seat request exceeds estimated users; enforce seat hygiene');
        }
        return violations;
    }
}
exports.ProcurementEngine = ProcurementEngine;
