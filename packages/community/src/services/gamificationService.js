"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const utils_js_1 = require("../utils.js");
class GamificationService {
    store;
    tracker;
    constructor(store, tracker) {
        this.store = store;
        this.tracker = tracker;
    }
    registerBadge(input) {
        const badge = {
            id: input.id ?? (0, utils_js_1.createId)('bdg'),
            label: input.label,
            description: input.description,
            points: input.points,
            icon: input.icon,
            accessibilityLabel: input.accessibilityLabel,
            criteria: { ...input.criteria },
        };
        this.store.upsertBadge(badge);
        return badge;
    }
    awardBadge(context) {
        const badge = this.store.getBadge(context.badgeId);
        if (!badge) {
            throw new Error(`Unknown badge ${context.badgeId}`);
        }
        return this.tracker.addBadge(context.userId, badge.id, badge.points);
    }
    awardPoints(userId, points) {
        if (points <= 0) {
            return this.tracker.getSummary(userId);
        }
        return this.tracker.addPoints(userId, points);
    }
    listBadges() {
        return this.store.listBadges();
    }
}
exports.GamificationService = GamificationService;
