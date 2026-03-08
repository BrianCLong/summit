"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const utils_js_1 = require("../utils.js");
const isActiveWithinDays = (date, days) => {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return date.getTime() >= cutoff;
};
const computeContentToModeratorRatio = (posts, moderationEvents) => {
    if (moderationEvents === 0) {
        return posts.length;
    }
    return posts.length / moderationEvents;
};
const sortByEngagement = (threads) => [...threads].sort((left, right) => right.viewCount - left.viewCount);
class AnalyticsService {
    store;
    constructor(store) {
        this.store = store;
    }
    snapshot() {
        const users = this.store.listUsers();
        const threads = this.store.listThreads();
        const posts = this.store.listPosts();
        const contributions = this.store.listContributions();
        const moderationEvents = this.store.listModerationLog();
        const badgeDistribution = new Map();
        for (const summary of contributions) {
            for (const badge of summary.badgesEarned) {
                badgeDistribution.set(badge, (badgeDistribution.get(badge) ?? 0) + 1);
            }
        }
        const activeUsers = users.filter((user) => isActiveWithinDays(user.lastActiveAt, 7));
        const topContributors = [...contributions]
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);
        return {
            generatedAt: new Date(),
            totalUsers: users.length,
            activeUsers7d: activeUsers.length,
            totalThreads: threads.length,
            totalPosts: posts.length,
            flaggedPosts: posts.filter((post) => post.flaggedBy.length > 0).length,
            badgeDistribution: Object.fromEntries(badgeDistribution.entries()),
            topContributors,
            contentToModeratorRatio: computeContentToModeratorRatio(posts, moderationEvents.length),
        };
    }
    engagementScore() {
        const contributions = this.store.listContributions();
        if (contributions.length === 0) {
            return 0;
        }
        const totalPoints = (0, utils_js_1.sum)(contributions.map((summary) => summary.points));
        return totalPoints / contributions.length;
    }
    trendingThreads(limit = 5) {
        const threads = sortByEngagement(this.store.listThreads());
        return threads.slice(0, limit);
    }
    retentionRate() {
        const users = this.store.listUsers();
        if (users.length === 0) {
            return 0;
        }
        const retained = users.filter((user) => isActiveWithinDays(user.lastActiveAt, 30)).length;
        return retained / users.length;
    }
    contributionLeaders(limit = 10) {
        return this.store
            .listContributions()
            .sort((left, right) => right.points - left.points)
            .slice(0, limit);
    }
}
exports.AnalyticsService = AnalyticsService;
