import type {
  ActivityEvent,
  BadgeDefinition,
  ContributionSummary,
  DiscussionThread,
  ForumCategory,
  ModerationAction,
  Notification,
  Post,
  UserProfile
} from './types.js';

const cloneArray = <T>(values: Iterable<T>): T[] => Array.from(values);

const cloneDate = (value: Date): Date => new Date(value.getTime());

const cloneUser = (profile: UserProfile): UserProfile => ({
  ...profile,
  interests: cloneArray(profile.interests),
  badges: cloneArray(profile.badges),
  accessibility: { ...profile.accessibility },
  joinedAt: cloneDate(profile.joinedAt),
  lastActiveAt: cloneDate(profile.lastActiveAt)
});

const cloneCategory = (category: ForumCategory): ForumCategory => ({
  ...category,
  createdAt: cloneDate(category.createdAt)
});

const cloneThread = (thread: DiscussionThread): DiscussionThread => ({
  ...thread,
  tags: cloneArray(thread.tags),
  postIds: cloneArray(thread.postIds),
  createdAt: cloneDate(thread.createdAt),
  updatedAt: cloneDate(thread.updatedAt),
  lastActivityAt: cloneDate(thread.lastActivityAt)
});

const clonePost = (post: Post): Post => ({
  ...post,
  flaggedBy: cloneArray(post.flaggedBy),
  moderationNotes: cloneArray(post.moderationNotes),
  createdAt: cloneDate(post.createdAt),
  updatedAt: cloneDate(post.updatedAt)
});

const cloneActivity = (activity: ActivityEvent): ActivityEvent => ({
  ...activity,
  createdAt: cloneDate(activity.createdAt),
  metadata: { ...activity.metadata }
});

const cloneBadge = (badge: BadgeDefinition): BadgeDefinition => ({
  ...badge,
  criteria: { ...badge.criteria }
});

const cloneNotification = (notification: Notification): Notification => ({
  ...notification,
  createdAt: cloneDate(notification.createdAt),
  readAt: notification.readAt ? cloneDate(notification.readAt) : null,
  metadata: { ...notification.metadata }
});

const cloneContribution = (summary: ContributionSummary): ContributionSummary => ({
  ...summary,
  badgesEarned: cloneArray(summary.badgesEarned)
});

const cloneModeration = (action: ModerationAction): ModerationAction => ({
  ...action,
  createdAt: cloneDate(action.createdAt)
});

export class CommunityStore {
  #users = new Map<string, UserProfile>();
  #categories = new Map<string, ForumCategory>();
  #threads = new Map<string, DiscussionThread>();
  #posts = new Map<string, Post>();
  #activities: ActivityEvent[] = [];
  #badges = new Map<string, BadgeDefinition>();
  #notifications = new Map<string, Notification[]>();
  #contributions = new Map<string, ContributionSummary>();
  #moderationLog: ModerationAction[] = [];

  public upsertUser(profile: UserProfile): void {
    this.#users.set(profile.id, cloneUser(profile));
  }

  public getUser(id: string): UserProfile | undefined {
    const profile = this.#users.get(id);
    return profile ? cloneUser(profile) : undefined;
  }

  public listUsers(): UserProfile[] {
    return Array.from(this.#users.values(), cloneUser);
  }

  public upsertCategory(category: ForumCategory): void {
    this.#categories.set(category.id, cloneCategory(category));
  }

  public getCategory(id: string): ForumCategory | undefined {
    const category = this.#categories.get(id);
    return category ? cloneCategory(category) : undefined;
  }

  public listCategories(): ForumCategory[] {
    return Array.from(this.#categories.values(), cloneCategory);
  }

  public upsertThread(thread: DiscussionThread): void {
    this.#threads.set(thread.id, cloneThread(thread));
  }

  public getThread(id: string): DiscussionThread | undefined {
    const thread = this.#threads.get(id);
    return thread ? cloneThread(thread) : undefined;
  }

  public listThreads(): DiscussionThread[] {
    return Array.from(this.#threads.values(), cloneThread);
  }

  public upsertPost(post: Post): void {
    this.#posts.set(post.id, clonePost(post));
  }

  public getPost(id: string): Post | undefined {
    const post = this.#posts.get(id);
    return post ? clonePost(post) : undefined;
  }

  public listPosts(): Post[] {
    return Array.from(this.#posts.values(), clonePost);
  }

  public appendActivity(activity: ActivityEvent): void {
    this.#activities.push(cloneActivity(activity));
  }

  public listActivities(userId?: string): ActivityEvent[] {
    const activities = userId
      ? this.#activities.filter((activity) => activity.userId === userId)
      : this.#activities;
    return activities.map(cloneActivity);
  }

  public upsertBadge(badge: BadgeDefinition): void {
    this.#badges.set(badge.id, cloneBadge(badge));
  }

  public getBadge(id: string): BadgeDefinition | undefined {
    const badge = this.#badges.get(id);
    return badge ? cloneBadge(badge) : undefined;
  }

  public listBadges(): BadgeDefinition[] {
    return Array.from(this.#badges.values(), cloneBadge);
  }

  public appendNotification(notification: Notification): void {
    const current = this.#notifications.get(notification.userId) ?? [];
    this.#notifications.set(notification.userId, [...current, cloneNotification(notification)]);
  }

  public listNotifications(userId: string): Notification[] {
    const queue = this.#notifications.get(userId) ?? [];
    return queue.map(cloneNotification);
  }

  public replaceNotifications(userId: string, notifications: Notification[]): void {
    this.#notifications.set(userId, notifications.map(cloneNotification));
  }

  public upsertContribution(summary: ContributionSummary): void {
    this.#contributions.set(summary.userId, cloneContribution(summary));
  }

  public getContribution(userId: string): ContributionSummary | undefined {
    const summary = this.#contributions.get(userId);
    return summary ? cloneContribution(summary) : undefined;
  }

  public listContributions(): ContributionSummary[] {
    return Array.from(this.#contributions.values(), cloneContribution);
  }

  public recordModeration(action: ModerationAction): void {
    this.#moderationLog.push(cloneModeration(action));
  }

  public listModerationLog(): ModerationAction[] {
    return this.#moderationLog.map(cloneModeration);
  }
}
