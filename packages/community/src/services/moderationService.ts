import { CommunityStore } from '../store.js';
import type { DiscussionThread, ModerationAction, Post } from '../types.js';
import { ActivityFeedService } from './activityFeedService.js';
import { NotificationService } from './notificationService.js';
import { createId } from '../utils.js';

export interface FlagPostInput {
  readonly postId: string;
  readonly userId: string;
  readonly reason: string;
}

export interface ModeratePostInput {
  readonly postId: string;
  readonly moderatorId: string;
  readonly action: 'remove' | 'restore';
  readonly reason: string;
}

export interface ThreadModerationInput {
  readonly threadId: string;
  readonly moderatorId: string;
  readonly action: 'lock' | 'unlock';
  readonly reason: string;
}

export class ModerationService {
  public constructor(
    private readonly store: CommunityStore,
    private readonly activity: ActivityFeedService,
    private readonly notifications: NotificationService
  ) {}

  public flagPost(input: FlagPostInput): Post {
    const post = this.store.getPost(input.postId);
    if (!post) {
      throw new Error(`Unknown post ${input.postId}`);
    }
    if (post.flaggedBy.includes(input.userId)) {
      return post;
    }
    const updated: Post = {
      ...post,
      flaggedBy: [...post.flaggedBy, input.userId],
      moderationNotes: [...post.moderationNotes, `Flagged: ${input.reason}`]
    };
    this.store.upsertPost(updated);
    this.activity.record({
      userId: input.userId,
      type: 'moderation_event',
      summary: 'Content flagged for review',
      metadata: { postId: post.id, reason: input.reason }
    });
    return updated;
  }

  public moderatePost(input: ModeratePostInput): Post {
    const post = this.store.getPost(input.postId);
    if (!post) {
      throw new Error(`Unknown post ${input.postId}`);
    }
    const updated: Post = {
      ...post,
      isRemoved: input.action === 'remove',
      moderationNotes: [...post.moderationNotes, `${input.action}: ${input.reason}`]
    };
    this.store.upsertPost(updated);

    const record: ModerationAction = {
      id: createId('mod'),
      moderatorId: input.moderatorId,
      targetPostId: post.id,
      action: input.action === 'remove' ? 'remove' : 'restore',
      reason: input.reason,
      createdAt: new Date()
    };
    this.store.recordModeration(record);
    this.activity.record({
      userId: input.moderatorId,
      type: 'moderation_event',
      summary: `Post ${input.action === 'remove' ? 'removed' : 'restored'}`,
      metadata: { postId: post.id, reason: input.reason }
    });

    if (post.authorId !== input.moderatorId) {
      this.notifications.notify({
        userId: post.authorId,
        message: `Your post was ${input.action === 'remove' ? 'removed' : 'restored'} by moderation`,
        metadata: { postId: post.id, action: input.action }
      });
    }

    return updated;
  }

  public moderateThread(input: ThreadModerationInput): DiscussionThread {
    const thread = this.store.getThread(input.threadId);
    if (!thread) {
      throw new Error(`Unknown thread ${input.threadId}`);
    }

    const updated: DiscussionThread =
      input.action === 'lock'
        ? { ...thread, isLocked: true, updatedAt: new Date() }
        : { ...thread, isLocked: false, updatedAt: new Date() };

    this.store.upsertThread(updated);
    const record: ModerationAction = {
      id: createId('mod'),
      moderatorId: input.moderatorId,
      targetPostId: '',
      action: input.action === 'lock' ? 'lock-thread' : 'unlock-thread',
      reason: input.reason,
      createdAt: new Date()
    };
    this.store.recordModeration(record);
    this.activity.record({
      userId: input.moderatorId,
      type: input.action === 'lock' ? 'thread_locked' : 'thread_unlocked',
      summary: `Thread ${input.action === 'lock' ? 'locked' : 'unlocked'}: ${thread.title}`,
      metadata: { threadId: thread.id, reason: input.reason }
    });

    return updated;
  }

  public listModerationActions(): ModerationAction[] {
    return this.store.listModerationLog();
  }
}
