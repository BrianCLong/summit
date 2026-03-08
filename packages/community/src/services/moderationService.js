"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationService = void 0;
const utils_js_1 = require("../utils.js");
class ModerationService {
    store;
    activity;
    notifications;
    constructor(store, activity, notifications) {
        this.store = store;
        this.activity = activity;
        this.notifications = notifications;
    }
    flagPost(input) {
        const post = this.store.getPost(input.postId);
        if (!post) {
            throw new Error(`Unknown post ${input.postId}`);
        }
        if (post.flaggedBy.includes(input.userId)) {
            return post;
        }
        const updated = {
            ...post,
            flaggedBy: [...post.flaggedBy, input.userId],
            moderationNotes: [...post.moderationNotes, `Flagged: ${input.reason}`],
        };
        this.store.upsertPost(updated);
        this.activity.record({
            userId: input.userId,
            type: 'moderation_event',
            summary: 'Content flagged for review',
            metadata: { postId: post.id, reason: input.reason },
        });
        return updated;
    }
    moderatePost(input) {
        const post = this.store.getPost(input.postId);
        if (!post) {
            throw new Error(`Unknown post ${input.postId}`);
        }
        const updated = {
            ...post,
            isRemoved: input.action === 'remove',
            moderationNotes: [
                ...post.moderationNotes,
                `${input.action}: ${input.reason}`,
            ],
        };
        this.store.upsertPost(updated);
        const record = {
            id: (0, utils_js_1.createId)('mod'),
            moderatorId: input.moderatorId,
            targetPostId: post.id,
            action: input.action === 'remove' ? 'remove' : 'restore',
            reason: input.reason,
            createdAt: new Date(),
        };
        this.store.recordModeration(record);
        this.activity.record({
            userId: input.moderatorId,
            type: 'moderation_event',
            summary: `Post ${input.action === 'remove' ? 'removed' : 'restored'}`,
            metadata: { postId: post.id, reason: input.reason },
        });
        if (post.authorId !== input.moderatorId) {
            this.notifications.notify({
                userId: post.authorId,
                message: `Your post was ${input.action === 'remove' ? 'removed' : 'restored'} by moderation`,
                metadata: { postId: post.id, action: input.action },
            });
        }
        return updated;
    }
    moderateThread(input) {
        const thread = this.store.getThread(input.threadId);
        if (!thread) {
            throw new Error(`Unknown thread ${input.threadId}`);
        }
        const updated = input.action === 'lock'
            ? { ...thread, isLocked: true, updatedAt: new Date() }
            : { ...thread, isLocked: false, updatedAt: new Date() };
        this.store.upsertThread(updated);
        const record = {
            id: (0, utils_js_1.createId)('mod'),
            moderatorId: input.moderatorId,
            targetPostId: '',
            action: input.action === 'lock' ? 'lock-thread' : 'unlock-thread',
            reason: input.reason,
            createdAt: new Date(),
        };
        this.store.recordModeration(record);
        this.activity.record({
            userId: input.moderatorId,
            type: input.action === 'lock' ? 'thread_locked' : 'thread_unlocked',
            summary: `Thread ${input.action === 'lock' ? 'locked' : 'unlocked'}: ${thread.title}`,
            metadata: { threadId: thread.id, reason: input.reason },
        });
        return updated;
    }
    listModerationActions() {
        return this.store.listModerationLog();
    }
}
exports.ModerationService = ModerationService;
