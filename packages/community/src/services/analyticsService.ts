import { CommunityStore } from '../store.js';
import type { AnalyticsSnapshot, ContributionSummary, DiscussionThread, Post } from '../types.js';
import { sum } from '../utils.js';

const isActiveWithinDays = (date: Date, days: number): boolean => {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
};

const computeContentToModeratorRatio = (posts: Post[], moderationEvents: number): number => {
  if (moderationEvents === 0) {
    return posts.length;
  }
  return posts.length / moderationEvents;
};

const sortByEngagement = (threads: DiscussionThread[]): DiscussionThread[] =>
  [...threads].sort((left, right) => right.viewCount - left.viewCount);

export class AnalyticsService {
  public constructor(private readonly store: CommunityStore) {}

  public snapshot(): AnalyticsSnapshot {
    const users = this.store.listUsers();
    const threads = this.store.listThreads();
    const posts = this.store.listPosts();
    const contributions = this.store.listContributions();
    const moderationEvents = this.store.listModerationLog();

    const badgeDistribution = new Map<string, number>();
    for (const summary of contributions) {
      for (const badge of summary.badgesEarned) {
        badgeDistribution.set(badge, (badgeDistribution.get(badge) ?? 0) + 1);
      }
    }

    const activeUsers = users.filter((user) => isActiveWithinDays(user.lastActiveAt, 7));
    const topContributors = [...contributions].sort((a, b) => b.points - a.points).slice(0, 5);

    return {
      generatedAt: new Date(),
      totalUsers: users.length,
      activeUsers7d: activeUsers.length,
      totalThreads: threads.length,
      totalPosts: posts.length,
      flaggedPosts: posts.filter((post) => post.flaggedBy.length > 0).length,
      badgeDistribution: Object.fromEntries(badgeDistribution.entries()),
      topContributors,
      contentToModeratorRatio: computeContentToModeratorRatio(posts, moderationEvents.length)
    };
  }

  public engagementScore(): number {
    const contributions = this.store.listContributions();
    if (contributions.length === 0) {
      return 0;
    }
    const totalPoints = sum(contributions.map((summary) => summary.points));
    return totalPoints / contributions.length;
  }

  public trendingThreads(limit = 5): DiscussionThread[] {
    const threads = sortByEngagement(this.store.listThreads());
    return threads.slice(0, limit);
  }

  public retentionRate(): number {
    const users = this.store.listUsers();
    if (users.length === 0) {
      return 0;
    }
    const retained = users.filter((user) => isActiveWithinDays(user.lastActiveAt, 30)).length;
    return retained / users.length;
  }

  public contributionLeaders(limit = 10): ContributionSummary[] {
    return this.store
      .listContributions()
      .sort((left, right) => right.points - left.points)
      .slice(0, limit);
  }
}
