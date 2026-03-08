"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealRegistrationBook = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const types_1 = require("./types");
const DEFAULT_EXPIRY_DAYS = 90;
class DealRegistrationBook {
    registrations = new Map();
    register(partnerId, partnerSegment, tierScore, expiryDays = DEFAULT_EXPIRY_DAYS) {
        const now = (0, dayjs_1.default)();
        const registration = {
            partnerId,
            partnerSegment,
            tierScore,
            registeredAt: now.toDate(),
            expiresAt: now.add(expiryDays, 'day').toDate(),
            status: 'active',
            activityLog: [{ at: now.toDate(), description: 'registered' }],
        };
        const entries = this.registrations.get(partnerId) ?? [];
        entries.push(registration);
        this.registrations.set(partnerId, entries);
        return registration;
    }
    recordActivity(partnerId, description, extensionDays = 30) {
        const active = this.getActive(partnerId);
        if (!active)
            return undefined;
        const updated = { ...active };
        updated.activityLog = [...active.activityLog, { at: new Date(), description }];
        updated.expiresAt = (0, dayjs_1.default)(updated.expiresAt).add(extensionDays, 'day').toDate();
        this.replace(partnerId, active, updated);
        return updated;
    }
    expireInactive(now = new Date()) {
        const expired = [];
        for (const [partnerId, list] of this.registrations.entries()) {
            list.forEach((entry) => {
                if (entry.status === 'active' && (0, dayjs_1.default)(now).isAfter(entry.expiresAt)) {
                    entry.status = 'expired';
                    entry.activityLog.push({ at: now, description: 'auto-expired' });
                    expired.push(entry);
                }
            });
            this.registrations.set(partnerId, list);
        }
        return expired;
    }
    close(partnerId, reason) {
        const active = this.getActive(partnerId);
        if (!active)
            return undefined;
        active.status = 'closed';
        active.activityLog.push({ at: new Date(), description: `closed: ${reason}` });
        return active;
    }
    resolveOwnership(conflicts) {
        if (conflicts.length === 0)
            return undefined;
        const sorted = [...conflicts].sort((a, b) => {
            const tierPriority = this.segmentPriority(b.partnerSegment) - this.segmentPriority(a.partnerSegment);
            if (tierPriority !== 0)
                return tierPriority;
            return a.registeredAt.getTime() - b.registeredAt.getTime();
        });
        return sorted[0];
    }
    getActive(partnerId) {
        return (this.registrations.get(partnerId) ?? []).find((r) => r.status === 'active');
    }
    replace(partnerId, current, updated) {
        const list = this.registrations.get(partnerId) ?? [];
        const idx = list.indexOf(current);
        if (idx >= 0) {
            list[idx] = updated;
            this.registrations.set(partnerId, list);
        }
    }
    segmentPriority(segment) {
        switch (segment) {
            case types_1.PartnerSegment.STRATEGIC:
                return 3;
            case types_1.PartnerSegment.GROWTH:
                return 2;
            default:
                return 1;
        }
    }
}
exports.DealRegistrationBook = DealRegistrationBook;
