"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityHub = void 0;
const store_js_1 = require("../store.js");
const activityFeedService_js_1 = require("./activityFeedService.js");
const contributionTracker_js_1 = require("./contributionTracker.js");
const gamificationService_js_1 = require("./gamificationService.js");
const discussionForumService_js_1 = require("./discussionForumService.js");
const notificationService_js_1 = require("./notificationService.js");
const userProfileService_js_1 = require("./userProfileService.js");
const moderationService_js_1 = require("./moderationService.js");
const searchService_js_1 = require("./searchService.js");
const analyticsService_js_1 = require("./analyticsService.js");
const dashboardService_js_1 = require("./dashboardService.js");
class CommunityHub {
    store;
    activity;
    contributions;
    gamification;
    forum;
    notifications;
    profiles;
    moderation;
    search;
    analytics;
    dashboard;
    constructor(store) {
        this.store = store ?? new store_js_1.CommunityStore();
        this.activity = new activityFeedService_js_1.ActivityFeedService(this.store);
        this.contributions = new contributionTracker_js_1.ContributionTracker(this.store);
        this.notifications = new notificationService_js_1.NotificationService(this.store);
        this.gamification = new gamificationService_js_1.GamificationService(this.store, this.contributions);
        this.forum = new discussionForumService_js_1.DiscussionForumService(this.store, this.activity, this.contributions, this.gamification, this.notifications);
        this.profiles = new userProfileService_js_1.UserProfileService(this.store, this.activity, this.contributions);
        this.moderation = new moderationService_js_1.ModerationService(this.store, this.activity, this.notifications);
        this.search = new searchService_js_1.SearchService(this.store);
        this.analytics = new analyticsService_js_1.AnalyticsService(this.store);
        this.dashboard = new dashboardService_js_1.DashboardService(this.analytics, this.contributions);
    }
}
exports.CommunityHub = CommunityHub;
