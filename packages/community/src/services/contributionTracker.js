"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionTracker = void 0;
class ContributionTracker {
    store;
    constructor(store) {
        this.store = store;
    }
    bootstrap(userId) {
        const existing = this.store.getContribution(userId);
        if (existing) {
            return existing;
        }
        const summary = {
            userId,
            threadsCreated: 0,
            postsCreated: 0,
            repliesAuthored: 0,
            solutionsMarked: 0,
            reactionsReceived: 0,
            badgesEarned: [],
            points: 0,
            streakLength: 0,
        };
        this.store.upsertContribution(summary);
        return summary;
    }
    incrementThreads(userId) {
        const current = this.bootstrap(userId);
        const updated = {
            ...current,
            threadsCreated: current.threadsCreated + 1,
            streakLength: current.streakLength + 1,
        };
        this.store.upsertContribution(updated);
        return updated;
    }
    incrementPosts(userId, isReply) {
        const current = this.bootstrap(userId);
        const updated = {
            ...current,
            postsCreated: current.postsCreated + 1,
            repliesAuthored: isReply
                ? current.repliesAuthored + 1
                : current.repliesAuthored,
            streakLength: current.streakLength + 1,
        };
        this.store.upsertContribution(updated);
        return updated;
    }
    addReactionReceived(userId) {
        const current = this.bootstrap(userId);
        const updated = {
            ...current,
            reactionsReceived: current.reactionsReceived + 1,
        };
        this.store.upsertContribution(updated);
        return updated;
    }
    addBadge(userId, badgeId, points) {
        const current = this.bootstrap(userId);
        if (current.badgesEarned.includes(badgeId)) {
            return current;
        }
        const updated = {
            ...current,
            badgesEarned: [...current.badgesEarned, badgeId],
            points: current.points + points,
        };
        this.store.upsertContribution(updated);
        return updated;
    }
    addPoints(userId, points) {
        const current = this.bootstrap(userId);
        const updated = {
            ...current,
            points: current.points + points,
        };
        this.store.upsertContribution(updated);
        return updated;
    }
    resetStreak(userId) {
        const current = this.bootstrap(userId);
        const updated = {
            ...current,
            streakLength: 0,
        };
        this.store.upsertContribution(updated);
        return updated;
    }
    getSummary(userId) {
        return this.bootstrap(userId);
    }
    listTopContributors(limit) {
        return this.store
            .listContributions()
            .sort((left, right) => right.points - left.points)
            .slice(0, limit);
    }
}
exports.ContributionTracker = ContributionTracker;
