"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const index_js_1 = require("../src/index.js");
const createUser = (hub, name) => hub.profiles.createProfile({ displayName: name });
const createThreadWithReply = (hub, categoryId, author, replier) => {
    const thread = hub.forum.createThread({
        title: 'How to build accessible dashboards?',
        categoryId,
        authorId: author.id,
        body: 'Share your best WCAG 2.1 tips.',
        tags: ['accessibility', 'dashboards'],
    });
    const parentPostId = thread.postIds[0];
    strict_1.default.ok(parentPostId, 'Expected the seed post to exist');
    const reply = hub.forum.createPost({
        threadId: thread.id,
        authorId: replier.id,
        parentPostId,
        content: 'Consider keyboard traps and focus states!',
    });
    return { thread, firstReply: reply };
};
(0, node_test_1.default)('CommunityHub integration flow', () => {
    const hub = new index_js_1.CommunityHub();
    const researcher = createUser(hub, 'Researcher Robin');
    const analyst = createUser(hub, 'Analyst Alex');
    const category = hub.forum.createCategory({
        name: 'Best Practices',
        description: 'Share frameworks, playbooks, and UI heuristics.',
    });
    const { thread, firstReply } = createThreadWithReply(hub, category.id, researcher, analyst);
    strict_1.default.strictEqual(thread.postIds.length, 1);
    strict_1.default.strictEqual(firstReply.parentPostId, thread.postIds[0]);
    const notificationsForResearcher = hub.notifications.list(researcher.id);
    strict_1.default.strictEqual(notificationsForResearcher.length, 1);
    const threadReplyNotification = notificationsForResearcher[0];
    strict_1.default.ok(threadReplyNotification, 'Expected a reply notification');
    strict_1.default.match(threadReplyNotification.message, /replied to your post/);
    const notificationsForAnalyst = hub.notifications.list(analyst.id);
    strict_1.default.deepStrictEqual(notificationsForAnalyst, []);
    const reaction = hub.forum.reactToPost(firstReply.id, researcher.id);
    strict_1.default.strictEqual(reaction.reactionCount, 1);
    const flagged = hub.moderation.flagPost({
        postId: firstReply.id,
        userId: researcher.id,
        reason: 'Contains sensitive project names',
    });
    strict_1.default.ok(flagged.flaggedBy.includes(researcher.id));
    const removed = hub.moderation.moderatePost({
        postId: firstReply.id,
        moderatorId: analyst.id,
        action: 'remove',
        reason: 'PII detected',
    });
    strict_1.default.strictEqual(removed.isRemoved, true);
    const moderationEvents = hub.moderation.listModerationActions();
    strict_1.default.strictEqual(moderationEvents.length, 1);
    hub.moderation.moderateThread({
        threadId: thread.id,
        moderatorId: analyst.id,
        action: 'lock',
        reason: 'Investigation complete',
    });
    const lockedThread = hub.store.getThread(thread.id);
    strict_1.default.strictEqual(lockedThread?.isLocked ?? false, true);
    strict_1.default.throws(() => hub.forum.createPost({
        threadId: thread.id,
        authorId: researcher.id,
        content: 'Thanks for the update!',
    }), /Thread is locked/);
    hub.moderation.moderateThread({
        threadId: thread.id,
        moderatorId: analyst.id,
        action: 'unlock',
        reason: 'Continuing knowledge sharing',
    });
    const reopened = hub.forum.createPost({
        threadId: thread.id,
        authorId: researcher.id,
        content: 'Documenting mitigation steps for accessible dashboards.',
    });
    strict_1.default.strictEqual(reopened.isRemoved, false);
    const searchResults = hub.search.search('dashboards accessibility');
    strict_1.default.ok(searchResults.some((result) => result.type === 'thread'));
    strict_1.default.ok(searchResults.some((result) => result.type === 'post'));
    const tagSuggestions = hub.search.suggestTags('dash');
    strict_1.default.ok(tagSuggestions.includes('dashboards'));
    const snapshot = hub.analytics.snapshot();
    strict_1.default.strictEqual(snapshot.totalUsers, 2);
    strict_1.default.strictEqual(snapshot.totalThreads, 1);
    strict_1.default.ok(snapshot.totalPosts >= 2);
    strict_1.default.ok(snapshot.flaggedPosts >= 1);
    const dashboard = hub.dashboard.getSummary();
    strict_1.default.strictEqual(dashboard.snapshot.totalUsers, snapshot.totalUsers);
    strict_1.default.ok(dashboard.leaders.length > 0);
    strict_1.default.ok(dashboard.momentumScore >= 0);
    const contributions = hub.contributions.getSummary(researcher.id);
    strict_1.default.ok(contributions.points > 0);
    const activity = hub.activity.getFeed(researcher.id);
    strict_1.default.ok(activity.length > 0);
});
