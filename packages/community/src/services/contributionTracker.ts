import { CommunityStore } from '../store.js';
import type { ContributionSummary } from '../types.js';

export class ContributionTracker {
  public constructor(private readonly store: CommunityStore) {}

  public bootstrap(userId: string): ContributionSummary {
    const existing = this.store.getContribution(userId);
    if (existing) {
      return existing;
    }

    const summary: ContributionSummary = {
      userId,
      threadsCreated: 0,
      postsCreated: 0,
      repliesAuthored: 0,
      solutionsMarked: 0,
      reactionsReceived: 0,
      badgesEarned: [],
      points: 0,
      streakLength: 0,
    };
    this.store.upsertContribution(summary);
    return summary;
  }

  public incrementThreads(userId: string): ContributionSummary {
    const current = this.bootstrap(userId);
    const updated = {
      ...current,
      threadsCreated: current.threadsCreated + 1,
      streakLength: current.streakLength + 1,
    };
    this.store.upsertContribution(updated);
    return updated;
  }

  public incrementPosts(userId: string, isReply: boolean): ContributionSummary {
    const current = this.bootstrap(userId);
    const updated = {
      ...current,
      postsCreated: current.postsCreated + 1,
      repliesAuthored: isReply
        ? current.repliesAuthored + 1
        : current.repliesAuthored,
      streakLength: current.streakLength + 1,
    };
    this.store.upsertContribution(updated);
    return updated;
  }

  public addReactionReceived(userId: string): ContributionSummary {
    const current = this.bootstrap(userId);
    const updated = {
      ...current,
      reactionsReceived: current.reactionsReceived + 1,
    };
    this.store.upsertContribution(updated);
    return updated;
  }

  public addBadge(
    userId: string,
    badgeId: string,
    points: number,
  ): ContributionSummary {
    const current = this.bootstrap(userId);
    if (current.badgesEarned.includes(badgeId)) {
      return current;
    }

    const updated: ContributionSummary = {
      ...current,
      badgesEarned: [...current.badgesEarned, badgeId],
      points: current.points + points,
    };
    this.store.upsertContribution(updated);
    return updated;
  }

  public addPoints(userId: string, points: number): ContributionSummary {
    const current = this.bootstrap(userId);
    const updated = {
      ...current,
      points: current.points + points,
    };
    this.store.upsertContribution(updated);
    return updated;
  }

  public resetStreak(userId: string): ContributionSummary {
    const current = this.bootstrap(userId);
    const updated = {
      ...current,
      streakLength: 0,
    };
    this.store.upsertContribution(updated);
    return updated;
  }

  public getSummary(userId: string): ContributionSummary {
    return this.bootstrap(userId);
  }

  public listTopContributors(limit: number): ContributionSummary[] {
    return this.store
      .listContributions()
      .sort((left, right) => right.points - left.points)
      .slice(0, limit);
  }
}
