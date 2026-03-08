"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityFeedService = void 0;
const utils_js_1 = require("../utils.js");
class ActivityFeedService {
    store;
    constructor(store) {
        this.store = store;
    }
    record(input) {
        const event = {
            id: (0, utils_js_1.createId)('act'),
            userId: input.userId,
            type: input.type,
            summary: input.summary,
            createdAt: new Date(),
            metadata: { ...(input.metadata ?? {}) },
        };
        this.store.appendActivity(event);
        return event;
    }
    getFeed(userId) {
        return this.store.listActivities(userId);
    }
    getLatest(userId, limit) {
        return this.store
            .listActivities(userId)
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, limit);
    }
}
exports.ActivityFeedService = ActivityFeedService;
