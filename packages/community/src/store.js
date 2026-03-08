"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityStore = void 0;
const cloneArray = (values) => Array.from(values);
const cloneDate = (value) => new Date(value.getTime());
const cloneUser = (profile) => ({
    ...profile,
    interests: cloneArray(profile.interests),
    badges: cloneArray(profile.badges),
    accessibility: { ...profile.accessibility },
    joinedAt: cloneDate(profile.joinedAt),
    lastActiveAt: cloneDate(profile.lastActiveAt),
});
const cloneCategory = (category) => ({
    ...category,
    createdAt: cloneDate(category.createdAt),
});
const cloneThread = (thread) => ({
    ...thread,
    tags: cloneArray(thread.tags),
    postIds: cloneArray(thread.postIds),
    createdAt: cloneDate(thread.createdAt),
    updatedAt: cloneDate(thread.updatedAt),
    lastActivityAt: cloneDate(thread.lastActivityAt),
});
const clonePost = (post) => ({
    ...post,
    flaggedBy: cloneArray(post.flaggedBy),
    moderationNotes: cloneArray(post.moderationNotes),
    createdAt: cloneDate(post.createdAt),
    updatedAt: cloneDate(post.updatedAt),
});
const cloneActivity = (activity) => ({
    ...activity,
    createdAt: cloneDate(activity.createdAt),
    metadata: { ...activity.metadata },
});
const cloneBadge = (badge) => ({
    ...badge,
    criteria: { ...badge.criteria },
});
const cloneNotification = (notification) => ({
    ...notification,
    createdAt: cloneDate(notification.createdAt),
    readAt: notification.readAt ? cloneDate(notification.readAt) : null,
    metadata: { ...notification.metadata },
});
const cloneContribution = (summary) => ({
    ...summary,
    badgesEarned: cloneArray(summary.badgesEarned),
});
const cloneModeration = (action) => ({
    ...action,
    createdAt: cloneDate(action.createdAt),
});
class CommunityStore {
    #users = new Map();
    #categories = new Map();
    #threads = new Map();
    #posts = new Map();
    #activities = [];
    #badges = new Map();
    #notifications = new Map();
    #contributions = new Map();
    #moderationLog = [];
    upsertUser(profile) {
        this.#users.set(profile.id, cloneUser(profile));
    }
    getUser(id) {
        const profile = this.#users.get(id);
        return profile ? cloneUser(profile) : undefined;
    }
    listUsers() {
        return Array.from(this.#users.values(), cloneUser);
    }
    upsertCategory(category) {
        this.#categories.set(category.id, cloneCategory(category));
    }
    getCategory(id) {
        const category = this.#categories.get(id);
        return category ? cloneCategory(category) : undefined;
    }
    listCategories() {
        return Array.from(this.#categories.values(), cloneCategory);
    }
    upsertThread(thread) {
        this.#threads.set(thread.id, cloneThread(thread));
    }
    getThread(id) {
        const thread = this.#threads.get(id);
        return thread ? cloneThread(thread) : undefined;
    }
    listThreads() {
        return Array.from(this.#threads.values(), cloneThread);
    }
    upsertPost(post) {
        this.#posts.set(post.id, clonePost(post));
    }
    getPost(id) {
        const post = this.#posts.get(id);
        return post ? clonePost(post) : undefined;
    }
    listPosts() {
        return Array.from(this.#posts.values(), clonePost);
    }
    appendActivity(activity) {
        this.#activities.push(cloneActivity(activity));
    }
    listActivities(userId) {
        const activities = userId
            ? this.#activities.filter((activity) => activity.userId === userId)
            : this.#activities;
        return activities.map(cloneActivity);
    }
    upsertBadge(badge) {
        this.#badges.set(badge.id, cloneBadge(badge));
    }
    getBadge(id) {
        const badge = this.#badges.get(id);
        return badge ? cloneBadge(badge) : undefined;
    }
    listBadges() {
        return Array.from(this.#badges.values(), cloneBadge);
    }
    appendNotification(notification) {
        const current = this.#notifications.get(notification.userId) ?? [];
        this.#notifications.set(notification.userId, [
            ...current,
            cloneNotification(notification),
        ]);
    }
    listNotifications(userId) {
        const queue = this.#notifications.get(userId) ?? [];
        return queue.map(cloneNotification);
    }
    replaceNotifications(userId, notifications) {
        this.#notifications.set(userId, notifications.map(cloneNotification));
    }
    upsertContribution(summary) {
        this.#contributions.set(summary.userId, cloneContribution(summary));
    }
    getContribution(userId) {
        const summary = this.#contributions.get(userId);
        return summary ? cloneContribution(summary) : undefined;
    }
    listContributions() {
        return Array.from(this.#contributions.values(), cloneContribution);
    }
    recordModeration(action) {
        this.#moderationLog.push(cloneModeration(action));
    }
    listModerationLog() {
        return this.#moderationLog.map(cloneModeration);
    }
}
exports.CommunityStore = CommunityStore;
