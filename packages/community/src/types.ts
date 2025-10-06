export type ActivityType =
  | 'thread_created'
  | 'post_created'
  | 'post_replied'
  | 'post_reacted'
  | 'badge_awarded'
  | 'profile_updated'
  | 'moderation_event'
  | 'notification_sent'
  | 'thread_locked'
  | 'thread_unlocked';

export interface AccessibilityPreferences {
  readonly highContrast: boolean;
  readonly prefersReducedMotion: boolean;
  readonly prefersReducedTransparency: boolean;
  readonly fontScale: number;
  readonly locale: string;
}

export interface UserProfile {
  readonly id: string;
  readonly displayName: string;
  readonly bio: string;
  readonly avatarAltText: string;
  readonly interests: readonly string[];
  readonly accessibility: AccessibilityPreferences;
  readonly badges: readonly string[];
  readonly points: number;
  readonly joinedAt: Date;
  readonly lastActiveAt: Date;
}

export interface ForumCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: Date;
}

export interface DiscussionThread {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  readonly authorId: string;
  readonly tags: readonly string[];
  readonly postIds: readonly string[];
  readonly isLocked: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActivityAt: Date;
  readonly viewCount: number;
}

export interface Post {
  readonly id: string;
  readonly threadId: string;
  readonly parentPostId: string | null;
  readonly authorId: string;
  readonly content: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly reactionCount: number;
  readonly flaggedBy: readonly string[];
  readonly isRemoved: boolean;
  readonly moderationNotes: readonly string[];
}

export interface ActivityEvent {
  readonly id: string;
  readonly userId: string;
  readonly type: ActivityType;
  readonly createdAt: Date;
  readonly summary: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface BadgeDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly points: number;
  readonly icon: string;
  readonly accessibilityLabel: string;
  readonly criteria: Readonly<Record<string, number>>;
}

export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly message: string;
  readonly link: string | null;
  readonly createdAt: Date;
  readonly readAt: Date | null;
  readonly priority: 'low' | 'medium' | 'high';
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ContributionSummary {
  readonly userId: string;
  readonly threadsCreated: number;
  readonly postsCreated: number;
  readonly repliesAuthored: number;
  readonly solutionsMarked: number;
  readonly reactionsReceived: number;
  readonly badgesEarned: readonly string[];
  readonly points: number;
  readonly streakLength: number;
}

export interface ModerationAction {
  readonly id: string;
  readonly moderatorId: string;
  readonly targetPostId: string;
  readonly action: 'remove' | 'restore' | 'lock-thread' | 'unlock-thread';
  readonly reason: string;
  readonly createdAt: Date;
}

export interface SearchResult<T extends 'thread' | 'post' | 'profile'> {
  readonly id: string;
  readonly type: T;
  readonly score: number;
  readonly snippet: string;
  readonly tags: readonly string[];
}

export interface AnalyticsSnapshot {
  readonly generatedAt: Date;
  readonly totalUsers: number;
  readonly activeUsers7d: number;
  readonly totalThreads: number;
  readonly totalPosts: number;
  readonly flaggedPosts: number;
  readonly badgeDistribution: Readonly<Record<string, number>>;
  readonly topContributors: readonly ContributionSummary[];
  readonly contentToModeratorRatio: number;
}
