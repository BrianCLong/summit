"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalsStore = exports.ApprovalStore = void 0;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
const CLEARANCE_RANK = {
    public: 0,
    restricted: 1,
    confidential: 2,
    secret: 3,
};
function clearanceRank(level) {
    return CLEARANCE_RANK[level ?? ''] ?? -1;
}
function buildId() {
    return crypto_1.default.randomUUID
        ? crypto_1.default.randomUUID()
        : crypto_1.default.randomBytes(16).toString('hex');
}
class ApprovalStore {
    approvals = [];
    reset() {
        this.approvals = [];
    }
    recordApproval(input) {
        const record = {
            id: buildId(),
            action: input.action,
            resourceId: input.resourceId,
            tenantId: input.tenantId,
            requesterId: input.requesterId,
            approverId: input.approver.id,
            approverRoles: [...input.approver.roles],
            approverResidency: input.approver.residency,
            approverClearance: input.approver.clearance,
            decision: input.decision,
            decidedAt: new Date().toISOString(),
            note: input.note,
        };
        this.approvals.push(record);
        return record;
    }
    validateDualControl({ action, resource, requester, obligation, }) {
        const approvalsRequired = obligation?.approvals_required && obligation.approvals_required > 0
            ? obligation.approvals_required
            : 2;
        const requiredRoles = obligation?.approver_roles ?? [];
        const requireDistinct = obligation?.require_distinct ?? true;
        const matchResidency = obligation?.attributes?.match_residency ?? true;
        const requiredClearance = obligation?.attributes?.min_clearance ?? resource.classification;
        const resourceClassification = obligation?.attributes?.resource_classification ??
            resource.classification;
        const clearanceThreshold = Math.max(clearanceRank(requiredClearance), clearanceRank(resourceClassification));
        const resourceResidency = obligation?.attributes?.resource_residency ?? resource.residency;
        const reasons = [];
        const seen = new Set();
        const validApprovals = [];
        for (const approval of this.approvals) {
            if (approval.action !== action ||
                approval.resourceId !== resource.id ||
                approval.tenantId !== resource.tenantId ||
                approval.decision !== 'approved') {
                continue;
            }
            if (requireDistinct && seen.has(approval.approverId)) {
                continue;
            }
            if (approval.approverId === requester.id) {
                reasons.push('requester_cannot_self_approve');
                continue;
            }
            if (requiredRoles.length > 0 &&
                !approval.approverRoles.some((role) => requiredRoles.includes(role))) {
                reasons.push('approver_missing_role');
                continue;
            }
            if (matchResidency && approval.approverResidency !== resourceResidency) {
                reasons.push('approver_residency_mismatch');
                continue;
            }
            if (clearanceRank(approval.approverClearance) < clearanceThreshold) {
                reasons.push('approver_clearance_too_low');
                continue;
            }
            seen.add(approval.approverId);
            validApprovals.push(approval);
        }
        const satisfied = validApprovals.length >= approvalsRequired;
        return {
            satisfied,
            missing: satisfied ? 0 : approvalsRequired - validApprovals.length,
            approvals: validApprovals,
            reasons: satisfied ? [] : reasons,
        };
    }
}
exports.ApprovalStore = ApprovalStore;
exports.approvalsStore = new ApprovalStore();
