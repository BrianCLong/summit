"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileService = void 0;
const utils_js_1 = require("../utils.js");
const defaultAccessibility = {
    highContrast: false,
    prefersReducedMotion: true,
    prefersReducedTransparency: true,
    fontScale: 1,
    locale: 'en-US',
};
const normalizeAccessibility = (input) => ({
    highContrast: input?.highContrast ?? defaultAccessibility.highContrast,
    prefersReducedMotion: input?.prefersReducedMotion ?? defaultAccessibility.prefersReducedMotion,
    prefersReducedTransparency: input?.prefersReducedTransparency ??
        defaultAccessibility.prefersReducedTransparency,
    fontScale: (0, utils_js_1.clamp)(input?.fontScale ?? defaultAccessibility.fontScale, 0.8, 1.6),
    locale: input?.locale ?? defaultAccessibility.locale,
});
class UserProfileService {
    store;
    activity;
    contributions;
    constructor(store, activity, contributions) {
        this.store = store;
        this.activity = activity;
        this.contributions = contributions;
    }
    createProfile(input) {
        const now = new Date();
        const profile = {
            id: (0, utils_js_1.createId)('usr'),
            displayName: input.displayName.trim(),
            bio: input.bio?.trim() ?? '',
            avatarAltText: input.avatarAltText?.trim() ?? `${input.displayName} avatar`,
            interests: [...(input.interests ?? [])],
            accessibility: normalizeAccessibility(input.accessibility),
            badges: [],
            points: 0,
            joinedAt: now,
            lastActiveAt: now,
        };
        this.store.upsertUser(profile);
        this.contributions.bootstrap(profile.id);
        this.activity.record({
            userId: profile.id,
            type: 'profile_updated',
            summary: `Profile created for ${profile.displayName}`,
            metadata: { accessibility: profile.accessibility },
        });
        return profile;
    }
    updateProfile(userId, updates) {
        const existing = this.store.getUser(userId);
        if (!existing) {
            throw new Error(`Unknown user ${userId}`);
        }
        const updated = {
            ...existing,
            ...updates,
            accessibility: normalizeAccessibility({
                ...existing.accessibility,
                ...updates.accessibility,
            }),
            badges: updates.badges ? [...updates.badges] : existing.badges,
            interests: updates.interests
                ? [...updates.interests]
                : existing.interests,
            lastActiveAt: new Date(),
        };
        this.store.upsertUser(updated);
        this.activity.record({
            userId: updated.id,
            type: 'profile_updated',
            summary: `Profile updated for ${updated.displayName}`,
            metadata: updates,
        });
        return updated;
    }
    touch(userId) {
        const existing = this.store.getUser(userId);
        if (!existing) {
            throw new Error(`Unknown user ${userId}`);
        }
        const updated = { ...existing, lastActiveAt: new Date() };
        this.store.upsertUser(updated);
        return updated;
    }
    getProfile(userId) {
        const profile = this.store.getUser(userId);
        if (!profile) {
            throw new Error(`Unknown user ${userId}`);
        }
        return profile;
    }
    listProfiles() {
        return this.store.listUsers();
    }
}
exports.UserProfileService = UserProfileService;
