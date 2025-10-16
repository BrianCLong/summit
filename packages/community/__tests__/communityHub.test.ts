import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CommunityHub,
  type DiscussionThread,
  type Post,
  type UserProfile,
} from '../src/index.js';

const createUser = (hub: CommunityHub, name: string): UserProfile =>
  hub.profiles.createProfile({ displayName: name });

const createThreadWithReply = (
  hub: CommunityHub,
  categoryId: string,
  author: UserProfile,
  replier: UserProfile,
): { thread: DiscussionThread; firstReply: Post } => {
  const thread = hub.forum.createThread({
    title: 'How to build accessible dashboards?',
    categoryId,
    authorId: author.id,
    body: 'Share your best WCAG 2.1 tips.',
    tags: ['accessibility', 'dashboards'],
  });

  const parentPostId = thread.postIds[0];
  assert.ok(parentPostId, 'Expected the seed post to exist');

  const reply = hub.forum.createPost({
    threadId: thread.id,
    authorId: replier.id,
    parentPostId,
    content: 'Consider keyboard traps and focus states!',
  });

  return { thread, firstReply: reply };
};

test('CommunityHub integration flow', () => {
  const hub = new CommunityHub();
  const researcher = createUser(hub, 'Researcher Robin');
  const analyst = createUser(hub, 'Analyst Alex');

  const category = hub.forum.createCategory({
    name: 'Best Practices',
    description: 'Share frameworks, playbooks, and UI heuristics.',
  });

  const { thread, firstReply } = createThreadWithReply(
    hub,
    category.id,
    researcher,
    analyst,
  );

  assert.strictEqual(thread.postIds.length, 1);
  assert.strictEqual(firstReply.parentPostId, thread.postIds[0]);

  const notificationsForResearcher = hub.notifications.list(researcher.id);
  assert.strictEqual(notificationsForResearcher.length, 1);
  const threadReplyNotification = notificationsForResearcher[0];
  assert.ok(threadReplyNotification, 'Expected a reply notification');
  assert.match(threadReplyNotification.message, /replied to your post/);

  const notificationsForAnalyst = hub.notifications.list(analyst.id);
  assert.deepStrictEqual(notificationsForAnalyst, []);

  const reaction = hub.forum.reactToPost(firstReply.id, researcher.id);
  assert.strictEqual(reaction.reactionCount, 1);

  const flagged = hub.moderation.flagPost({
    postId: firstReply.id,
    userId: researcher.id,
    reason: 'Contains sensitive project names',
  });
  assert.ok(flagged.flaggedBy.includes(researcher.id));

  const removed = hub.moderation.moderatePost({
    postId: firstReply.id,
    moderatorId: analyst.id,
    action: 'remove',
    reason: 'PII detected',
  });
  assert.strictEqual(removed.isRemoved, true);
  const moderationEvents = hub.moderation.listModerationActions();
  assert.strictEqual(moderationEvents.length, 1);

  hub.moderation.moderateThread({
    threadId: thread.id,
    moderatorId: analyst.id,
    action: 'lock',
    reason: 'Investigation complete',
  });
  const lockedThread = hub.store.getThread(thread.id);
  assert.strictEqual(lockedThread?.isLocked ?? false, true);

  assert.throws(
    () =>
      hub.forum.createPost({
        threadId: thread.id,
        authorId: researcher.id,
        content: 'Thanks for the update!',
      }),
    /Thread is locked/,
  );

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
  assert.strictEqual(reopened.isRemoved, false);

  const searchResults = hub.search.search('dashboards accessibility');
  assert.ok(searchResults.some((result) => result.type === 'thread'));
  assert.ok(searchResults.some((result) => result.type === 'post'));

  const tagSuggestions = hub.search.suggestTags('dash');
  assert.ok(tagSuggestions.includes('dashboards'));

  const snapshot = hub.analytics.snapshot();
  assert.strictEqual(snapshot.totalUsers, 2);
  assert.strictEqual(snapshot.totalThreads, 1);
  assert.ok(snapshot.totalPosts >= 2);
  assert.ok(snapshot.flaggedPosts >= 1);

  const dashboard = hub.dashboard.getSummary();
  assert.strictEqual(dashboard.snapshot.totalUsers, snapshot.totalUsers);
  assert.ok(dashboard.leaders.length > 0);
  assert.ok(dashboard.momentumScore >= 0);

  const contributions = hub.contributions.getSummary(researcher.id);
  assert.ok(contributions.points > 0);

  const activity = hub.activity.getFeed(researcher.id);
  assert.ok(activity.length > 0);
});
