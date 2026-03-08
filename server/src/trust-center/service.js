"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustCenterService = void 0;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
class TrustCenterService {
    pages = [];
    evidence = [];
    claims = [];
    answers = [];
    controls = [];
    accessElevations = [];
    accessReviews = [];
    incidents = [];
    auditExports = [];
    privacyControls = [];
    procurementPackets = [];
    publishPage(input) {
        const currentVersion = this.pages
            .filter((p) => p.scope === input.scope)
            .reduce((max, page) => Math.max(max, page.version), 0);
        const version = input.version ?? currentVersion + 1;
        const page = {
            ...input,
            version,
            updatedAt: new Date(),
        };
        this.pages.push(page);
        return page;
    }
    listPages(scope) {
        return scope ? this.pages.filter((p) => p.scope === scope) : [...this.pages];
    }
    registerEvidence(input) {
        const checksum = crypto_1.default.createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const evidence = { ...input, checksum };
        this.evidence.push(evidence);
        return evidence;
    }
    registerClaim(input) {
        this.assertEvidenceExists(input.evidenceIds);
        const claim = {
            ...input,
            status: 'active',
            lastValidatedAt: new Date(),
            impactedByControls: [],
        };
        this.claims.push(claim);
        return claim;
    }
    addQuestionnaireAnswer(input) {
        this.assertEvidenceExists(input.evidencePointers);
        if (input.risk === 'high' && !input.deviation && !input.approvedBy) {
            throw new Error('High-risk answers require approval or a documented deviation.');
        }
        const answer = {
            ...input,
            approvedBy: input.approvedBy,
            approvedAt: input.approvedBy ? new Date() : undefined,
        };
        this.answers.push(answer);
        return answer;
    }
    approveAnswer(answerId, approver) {
        const answer = this.answers.find((a) => a.id === answerId);
        if (!answer)
            throw new Error(`Answer ${answerId} not found`);
        answer.approvedBy = approver;
        answer.approvedAt = new Date();
        return answer;
    }
    recordDeviation(answerId, deviation) {
        const answer = this.answers.find((a) => a.id === answerId);
        if (!answer)
            throw new Error(`Answer ${answerId} not found`);
        answer.deviation = deviation;
        return answer;
    }
    recordControlResult(input) {
        const control = { ...input };
        this.controls.push(control);
        if (control.status === 'fail') {
            this.flagDrift(control, input.relatedClaims ?? [], input.relatedAnswers ?? []);
        }
        return control;
    }
    scheduleAccessElevation(elevation) {
        const existing = this.accessElevations.find((e) => e.userId === elevation.userId && e.role === elevation.role && e.active);
        if (existing)
            existing.active = false;
        this.accessElevations.push(elevation);
        return elevation;
    }
    autoRevokeElevations(now = new Date()) {
        this.accessElevations.forEach((e) => {
            if (e.active && e.expiresAt <= now) {
                e.active = false;
            }
        });
        return this.accessElevations.filter((e) => !e.active && e.expiresAt <= now);
    }
    completeAccessReview(review) {
        const revoked = this.accessElevations
            .filter((e) => e.active && e.expiresAt <= review.completedAt)
            .map((e) => {
            e.active = false;
            return `${e.userId}:${e.role}`;
        });
        const entry = { ...review, autoRevoked: revoked };
        this.accessReviews.push(entry);
        return entry;
    }
    logIncident(incident) {
        this.incidents.push(incident);
        return incident;
    }
    exportAuditLog(scope, entries) {
        const manifestHash = crypto_1.default.createHash('sha256').update(entries.join('|')).digest('hex');
        const exportRecord = {
            id: `${scope}-${Date.now()}`,
            manifestHash,
            scope,
            createdAt: new Date(),
        };
        this.auditExports.push(exportRecord);
        return exportRecord;
    }
    upsertPrivacyControl(control) {
        const existing = this.privacyControls.find((c) => c.id === control.id);
        if (existing) {
            Object.assign(existing, control);
            return existing;
        }
        this.privacyControls.push(control);
        return control;
    }
    upsertProcurementPacket(packet) {
        const existing = this.procurementPackets.find((p) => p.id === packet.id);
        if (existing) {
            Object.assign(existing, packet);
            return existing;
        }
        this.procurementPackets.push(packet);
        return packet;
    }
    generateScorecard() {
        const operational = {
            controlPassRate: this.calculateControlPassRate(),
            incidentCount: this.incidents.length,
            activeElevations: this.accessElevations.filter((e) => e.active).length,
        };
        const governance = {
            staleClaims: this.claims.filter((c) => c.status !== 'active').length,
            answerDeviations: this.answers.filter((a) => a.deviation).length,
            auditExports: this.auditExports.length,
        };
        const commercial = {
            trustPackets: this.procurementPackets.length,
            questionnaireDeflectionRate: this.computeDeflectionRate(),
            fastLaneSla: this.procurementPackets.reduce((min, p) => Math.min(min, p.fastLaneSlaDays), this.procurementPackets.length ? Infinity : 0),
        };
        const quality = {
            sbomCoverage: 100,
            supplyChainIntegrity: this.controls.some((c) => c.name.includes('signed')) ? 100 : 80,
            remediationCycleTime: this.calculateRemediationCycleTime(),
        };
        return { operational, governance, commercial, quality };
    }
    calculateControlPassRate() {
        if (!this.controls.length)
            return 100;
        const passes = this.controls.filter((c) => c.status === 'pass').length;
        return Math.round((passes / this.controls.length) * 100);
    }
    computeDeflectionRate() {
        if (!this.answers.length)
            return 0;
        const reusable = this.answers.filter((a) => !a.deviation).length;
        return Math.round((reusable / this.answers.length) * 100);
    }
    calculateRemediationCycleTime() {
        const failures = this.controls.filter((c) => c.status === 'fail');
        if (!failures.length)
            return 0;
        // Represent cycle time as count of fail items for simplicity; real impl would track duration
        return failures.length;
    }
    flagDrift(control, relatedClaims, relatedAnswers) {
        relatedClaims.forEach((claimId) => {
            const claim = this.claims.find((c) => c.id === claimId);
            if (claim) {
                claim.status = 'drifted';
                claim.impactedByControls.push(control.id);
            }
        });
        relatedAnswers.forEach((answerId) => {
            const answer = this.answers.find((a) => a.id === answerId);
            if (answer) {
                answer.deviation = answer.deviation ?? {
                    justification: 'Auto-detected drift from control failure',
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                    approvedBy: 'system',
                };
            }
        });
    }
    assertEvidenceExists(evidenceIds) {
        const missing = evidenceIds.filter((id) => !this.evidence.some((e) => e.id === id));
        if (missing.length) {
            throw new Error(`Missing evidence: ${missing.join(', ')}`);
        }
    }
}
exports.TrustCenterService = TrustCenterService;
