"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerScorecard = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
class PartnerScorecard {
    metrics = new Map();
    upsert(partnerId, metrics) {
        const merged = { ...metrics, updatedAt: new Date() };
        this.metrics.set(partnerId, merged);
        return merged;
    }
    get(partnerId) {
        return this.metrics.get(partnerId);
    }
    isStale(partnerId, now = new Date()) {
        const current = this.metrics.get(partnerId);
        if (!current)
            return true;
        return (0, dayjs_1.default)(now).diff((0, dayjs_1.default)(current.updatedAt), 'day') >= 7;
    }
}
exports.PartnerScorecard = PartnerScorecard;
