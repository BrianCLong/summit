"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
class DashboardService {
    analytics;
    tracker;
    constructor(analytics, tracker) {
        this.analytics = analytics;
        this.tracker = tracker;
    }
    getSummary() {
        const snapshot = this.analytics.snapshot();
        const averagePoints = this.analytics.engagementScore();
        const retention = this.analytics.retentionRate();
        const momentumScore = Number(((averagePoints + retention * 100) / 2).toFixed(2));
        const leaders = this.tracker.listTopContributors(5);
        return { snapshot, momentumScore, leaders };
    }
}
exports.DashboardService = DashboardService;
