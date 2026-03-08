"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalHoldService = void 0;
const uuid_1 = require("uuid");
class LegalHoldService {
    holds = new Map();
    applyHold(recordType, tenantId, appliedBy, reason, scope = 'record', recordIds) {
        const hold = {
            id: (0, uuid_1.v4)(),
            recordType,
            tenantId,
            scope,
            recordIds,
            appliedBy,
            reason,
            createdAt: new Date(),
        };
        this.holds.set(hold.id, hold);
        return hold;
    }
    releaseHold(holdId) {
        const hold = this.holds.get(holdId);
        if (!hold) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        hold.releasedAt = new Date();
        this.holds.set(holdId, hold);
        return hold;
    }
    listActive() {
        return Array.from(this.holds.values()).filter(hold => !hold.releasedAt);
    }
    holdsForRecord(recordId, recordType, tenantId) {
        return this.listActive().filter(hold => {
            if (hold.scope === 'tenant')
                return hold.tenantId === tenantId;
            if (hold.scope === 'type')
                return hold.recordType === recordType && hold.tenantId === tenantId;
            return hold.recordIds?.includes(recordId) ?? false;
        });
    }
}
exports.LegalHoldService = LegalHoldService;
