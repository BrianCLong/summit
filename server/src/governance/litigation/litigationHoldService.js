"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitigationHoldService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const TRIGGERING_AUTHORITIES = new Set([
    'gc',
    'deputy_gc',
    'ciso',
    'head_of_people',
]);
class LitigationHoldService {
    repository;
    holds = new Map();
    constructor(repository) {
        this.repository = repository;
    }
    intakeMatter(form) {
        if (!TRIGGERING_AUTHORITIES.has(form.triggeringAuthority)) {
            throw new Error('Triggering authority not permitted to issue holds');
        }
        if (form.datasets.length === 0) {
            throw new Error('At least one dataset must be associated to a hold');
        }
        const issuedAt = new Date();
        const acknowledgementDeadline = this.addHours(issuedAt, 4);
        const preservationDeadline = this.addHours(issuedAt, 24);
        const hold = {
            id: node_crypto_1.default.randomUUID(),
            datasetId: form.datasets[0],
            matterNumber: form.matterNumber,
            issuedAt,
            issuedBy: form.triggeringAuthority,
            datasets: form.datasets,
            deadlineAcknowledgement: acknowledgementDeadline,
            deadlinePreservation: preservationDeadline,
            reason: `${form.title}: ${form.description}`,
            requestedBy: form.triggeringAuthority,
            createdAt: issuedAt,
            scope: 'full',
            custodians: form.custodians,
            systems: form.systems,
            privileged: form.privilegeStatus === 'privileged',
            acknowledgements: [],
            status: 'active',
        };
        this.holds.set(hold.id, hold);
        return hold;
    }
    async applyHoldToDataset(datasetId, hold) {
        const legalHold = {
            datasetId,
            reason: hold.reason,
            requestedBy: hold.requestedBy,
            createdAt: hold.createdAt,
            expiresAt: hold.deadlinePreservation,
            scope: 'full',
            matterNumber: hold.matterNumber,
            custodians: hold.custodians,
            systems: hold.systems,
            privileged: hold.privileged,
            acknowledgedBy: hold.acknowledgements,
            status: hold.status,
        };
        await this.repository.setLegalHold(datasetId, legalHold);
    }
    acknowledgeHold(holdId, custodianId, channel) {
        const hold = this.holds.get(holdId);
        if (!hold) {
            throw new Error(`Unknown hold ${holdId}`);
        }
        const acknowledgedAt = new Date();
        const hash = node_crypto_1.default
            .createHash('sha256')
            .update(`${holdId}:${custodianId}:${acknowledgedAt.toISOString()}`)
            .digest('hex');
        hold.acknowledgements.push({
            custodianId,
            acknowledgedAt,
            channel,
            acknowledgementHash: hash,
        });
        return hold;
    }
    hasActiveHold(datasetId) {
        return Array.from(this.holds.values()).some((hold) => (hold.datasetId === datasetId || hold.datasets.includes(datasetId)) &&
            hold.status === 'active');
    }
    activeHoldsForDataset(datasetId) {
        return Array.from(this.holds.values()).filter((hold) => (hold.datasetId === datasetId || hold.datasets.includes(datasetId)) &&
            hold.status === 'active');
    }
    releaseHold(holdId, releasedBy) {
        const hold = this.holds.get(holdId);
        if (!hold) {
            throw new Error(`Unknown hold ${holdId}`);
        }
        hold.status = 'released';
        hold.requestedBy = releasedBy;
        return hold;
    }
    addHours(date, hours) {
        const clone = new Date(date.getTime());
        clone.setHours(clone.getHours() + hours);
        return clone;
    }
}
exports.LitigationHoldService = LitigationHoldService;
