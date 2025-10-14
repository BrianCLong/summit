import { CommunityStore } from '../store.js';
import type { DiscussionThread, ForumCategory, Post } from '../types.js';
import { createId } from '../utils.js';
import { ActivityFeedService } from './activityFeedService.js';
import { ContributionTracker } from './contributionTracker.js';
import { GamificationService } from './gamificationService.js';
import { NotificationService } from './notificationService.js';

export interface CreateCategoryInput {
  readonly name: string;
  readonly description: string;
}

export interface CreateThreadInput {
  readonly title: string;
  readonly categoryId: string;
  readonly authorId: string;
  readonly tags?: readonly string[];
  readonly body: string;
}

export interface CreatePostInput {
  readonly threadId: string;
  readonly parentPostId?: string;
  readonly authorId: string;
  readonly content: string;
}

export class DiscussionForumService {
  public constructor(
    private readonly store: CommunityStore,
    private readonly activity: ActivityFeedService,
    private readonly contributions: ContributionTracker,
    private readonly gamification: GamificationService,
    private readonly notifications: NotificationService
  ) {}

  public createCategory(input: CreateCategoryInput): ForumCategory {
    const category: ForumCategory = {
      id: createId('cat'),
      name: input.name.trim(),
      description: input.description.trim(),
      createdAt: new Date()
    };
    this.store.upsertCategory(category);
    return category;
  }

  public createThread(input: CreateThreadInput): DiscussionThread {
    if (!this.store.getCategory(input.categoryId)) {
      throw new Error(`Unknown category ${input.categoryId}`);
    }

    const now = new Date();
    const thread: DiscussionThread = {
      id: createId('thr'),
      title: input.title.trim(),
      categoryId: input.categoryId,
      authorId: input.authorId,
      tags: [...(input.tags ?? [])],
      postIds: [],
      isLocked: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      viewCount: 0
    };
    this.store.upsertThread(thread);
    this.activity.record({
      userId: input.authorId,
      type: 'thread_created',
      summary: `Thread created: ${thread.title}`,
      metadata: { threadId: thread.id, categoryId: thread.categoryId }
    });
    this.contributions.incrementThreads(input.authorId);
    this.gamification.awardPoints(input.authorId, 10);

    this.createPost({
      threadId: thread.id,
      authorId: input.authorId,
      content: input.body
    });

    return this.store.getThread(thread.id)!;
  }

  public addView(threadId: string): DiscussionThread {
    const thread = this.store.getThread(threadId);
    if (!thread) {
      throw new Error(`Unknown thread ${threadId}`);
    }
    const updated: DiscussionThread = {
      ...thread,
      viewCount: thread.viewCount + 1,
      lastActivityAt: new Date()
    };
    this.store.upsertThread(updated);
    return updated;
  }

  public createPost(input: CreatePostInput): Post {
    const thread = this.store.getThread(input.threadId);
    if (!thread) {
      throw new Error(`Unknown thread ${input.threadId}`);
    }
    if (thread.isLocked) {
      throw new Error('Thread is locked');
    }

    const now = new Date();
    const post: Post = {
      id: createId('pst'),
      threadId: input.threadId,
      parentPostId: input.parentPostId ?? null,
      authorId: input.authorId,
      content: input.content.trim(),
      createdAt: now,
      updatedAt: now,
      reactionCount: 0,
      flaggedBy: [],
      isRemoved: false,
      moderationNotes: []
    };

    this.store.upsertPost(post);
    this.store.upsertThread({
      ...thread,
      postIds: [...thread.postIds, post.id],
      updatedAt: now,
      lastActivityAt: now
    });

    this.activity.record({
      userId: input.authorId,
      type: post.parentPostId ? 'post_replied' : 'post_created',
      summary: `Post added to ${thread.title}`,
      metadata: { threadId: thread.id, postId: post.id }
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
          metadata: { threadId: thread.id, postId: post.id }
        });
      }
    }

    if (!post.parentPostId && thread.authorId !== input.authorId) {
      this.notifications.notify({
        userId: thread.authorId,
        message: 'Your thread received a new post',
        link: `/threads/${thread.id}#${post.id}`,
        metadata: { threadId: thread.id, postId: post.id }
      });
    }

    return post;
  }

  public reactToPost(postId: string, reactingUserId: string): Post {
    const post = this.store.getPost(postId);
    if (!post) {
      throw new Error(`Unknown post ${postId}`);
    }
    if (post.isRemoved) {
      throw new Error('Cannot react to removed post');
    }
    const updated: Post = { ...post, reactionCount: post.reactionCount + 1 };
    this.store.upsertPost(updated);
    if (post.authorId !== reactingUserId) {
      this.contributions.addReactionReceived(post.authorId);
      this.notifications.notify({
        userId: post.authorId,
        message: 'Your contribution received appreciation',
        metadata: { postId: post.id }
      });
    }
    return updated;
  }

  public lockThread(threadId: string, moderatorId: string): DiscussionThread {
    const thread = this.store.getThread(threadId);
    if (!thread) {
      throw new Error(`Unknown thread ${threadId}`);
    }
    const updated: DiscussionThread = { ...thread, isLocked: true, updatedAt: new Date() };
    this.store.upsertThread(updated);
    this.activity.record({
      userId: moderatorId,
      type: 'thread_locked',
      summary: `Thread locked: ${thread.title}`,
      metadata: { threadId: thread.id }
    });
    return updated;
  }

  public unlockThread(threadId: string, moderatorId: string): DiscussionThread {
    const thread = this.store.getThread(threadId);
    if (!thread) {
      throw new Error(`Unknown thread ${threadId}`);
    }
    const updated: DiscussionThread = { ...thread, isLocked: false, updatedAt: new Date() };
    this.store.upsertThread(updated);
    this.activity.record({
      userId: moderatorId,
      type: 'thread_unlocked',
      summary: `Thread unlocked: ${thread.title}`,
      metadata: { threadId: thread.id }
    });
    return updated;
  }
}
