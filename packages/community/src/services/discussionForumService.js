"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscussionForumService = void 0;
const utils_js_1 = require("../utils.js");
class DiscussionForumService {
    store;
    activity;
    contributions;
    gamification;
    notifications;
    constructor(store, activity, contributions, gamification, notifications) {
        this.store = store;
        this.activity = activity;
        this.contributions = contributions;
        this.gamification = gamification;
        this.notifications = notifications;
    }
    createCategory(input) {
        const category = {
            id: (0, utils_js_1.createId)('cat'),
            name: input.name.trim(),
            description: input.description.trim(),
            createdAt: new Date(),
        };
        this.store.upsertCategory(category);
        return category;
    }
    createThread(input) {
        if (!this.store.getCategory(input.categoryId)) {
            throw new Error(`Unknown category ${input.categoryId}`);
        }
        const now = new Date();
        const thread = {
            id: (0, utils_js_1.createId)('thr'),
            title: input.title.trim(),
            categoryId: input.categoryId,
            authorId: input.authorId,
            tags: [...(input.tags ?? [])],
            postIds: [],
            isLocked: false,
            createdAt: now,
            updatedAt: now,
            lastActivityAt: now,
            viewCount: 0,
        };
        this.store.upsertThread(thread);
        this.activity.record({
            userId: input.authorId,
            type: 'thread_created',
            summary: `Thread created: ${thread.title}`,
            metadata: { threadId: thread.id, categoryId: thread.categoryId },
        });
        this.contributions.incrementThreads(input.authorId);
        this.gamification.awardPoints(input.authorId, 10);
        this.createPost({
            threadId: thread.id,
            authorId: input.authorId,
            content: input.body,
        });
        return this.store.getThread(thread.id);
    }
    addView(threadId) {
        const thread = this.store.getThread(threadId);
        if (!thread) {
            throw new Error(`Unknown thread ${threadId}`);
        }
        const updated = {
            ...thread,
            viewCount: thread.viewCount + 1,
            lastActivityAt: new Date(),
        };
        this.store.upsertThread(updated);
        return updated;
    }
    createPost(input) {
        const thread = this.store.getThread(input.threadId);
        if (!thread) {
            throw new Error(`Unknown thread ${input.threadId}`);
        }
        if (thread.isLocked) {
            throw new Error('Thread is locked');
        }
        const now = new Date();
        const post = {
            id: (0, utils_js_1.createId)('pst'),
            threadId: input.threadId,
            parentPostId: input.parentPostId ?? null,
            authorId: input.authorId,
            content: input.content.trim(),
            createdAt: now,
            updatedAt: now,
            reactionCount: 0,
            flaggedBy: [],
            isRemoved: false,
            moderationNotes: [],
        };
        this.store.upsertPost(post);
        this.store.upsertThread({
            ...thread,
            postIds: [...thread.postIds, post.id],
            updatedAt: now,
            lastActivityAt: now,
        });
        this.activity.record({
            userId: input.authorId,
            type: post.parentPostId ? 'post_replied' : 'post_created',
            summary: `Post added to ${thread.title}`,
            metadata: { threadId: thread.id, postId: post.id },
        });
        this.contributions.incrementPosts(input.authorId, Boolean(post.parentPostId));
        this.gamification.awardPoints(input.authorId, 5);
        if (post.parentPostId) {
            const parent = this.store.getPost(post.parentPostId);
            if (parent && parent.authorId !== input.authorId) {
                this.notifications.notify({
                    userId: parent.authorId,
                    message: 'Someone replied to your post',
                    link: `/threads/${thread.id}#${post.id}`,
                    metadata: { threadId: thread.id, postId: post.id },
                });
            }
        }
        if (!post.parentPostId && thread.authorId !== input.authorId) {
            this.notifications.notify({
                userId: thread.authorId,
                message: 'Your thread received a new post',
                link: `/threads/${thread.id}#${post.id}`,
                metadata: { threadId: thread.id, postId: post.id },
            });
        }
        return post;
    }
    reactToPost(postId, reactingUserId) {
        const post = this.store.getPost(postId);
        if (!post) {
            throw new Error(`Unknown post ${postId}`);
        }
        if (post.isRemoved) {
            throw new Error('Cannot react to removed post');
        }
        const updated = { ...post, reactionCount: post.reactionCount + 1 };
        this.store.upsertPost(updated);
        if (post.authorId !== reactingUserId) {
            this.contributions.addReactionReceived(post.authorId);
            this.notifications.notify({
                userId: post.authorId,
                message: 'Your contribution received appreciation',
                metadata: { postId: post.id },
            });
        }
        return updated;
    }
    lockThread(threadId, moderatorId) {
        const thread = this.store.getThread(threadId);
        if (!thread) {
            throw new Error(`Unknown thread ${threadId}`);
        }
        const updated = {
            ...thread,
            isLocked: true,
            updatedAt: new Date(),
        };
        this.store.upsertThread(updated);
        this.activity.record({
            userId: moderatorId,
            type: 'thread_locked',
            summary: `Thread locked: ${thread.title}`,
            metadata: { threadId: thread.id },
        });
        return updated;
    }
    unlockThread(threadId, moderatorId) {
        const thread = this.store.getThread(threadId);
        if (!thread) {
            throw new Error(`Unknown thread ${threadId}`);
        }
        const updated = {
            ...thread,
            isLocked: false,
            updatedAt: new Date(),
        };
        this.store.upsertThread(updated);
        this.activity.record({
            userId: moderatorId,
            type: 'thread_unlocked',
            summary: `Thread unlocked: ${thread.title}`,
            metadata: { threadId: thread.id },
        });
        return updated;
    }
}
exports.DiscussionForumService = DiscussionForumService;
