import { Octokit } from '@octokit/rest';
import { logger } from '../../server/utils/logger';

// SPACE Framework: Satisfaction, Performance, Activity, Communication, Efficiency
export interface SPACEMetrics {
  satisfaction: number; // 0-100 based on PR feedback, review sentiment
  performance: {
    throughput: number; // PRs merged per week
    velocity: number; // story points or commits per sprint
    quality: number; // defect rate, test coverage
  };
  activity: {
    commitsPerDev: number;
    prActivity: number;
    codeReviews: number;
  };
  communication: {
    reviewResponseTime: number; // hours
    collaborationScore: number; // cross-team interactions
  };
  efficiency: {
    flowTime: number; // time from start to delivery
    focusTime: number; // uninterrupted work time
  };
}

export class SPACEMetricsCollector {
  private developerActivity: Map<string, DeveloperActivity> = new Map();
  private teamMetrics: TeamMetrics[] = [];

  constructor(private octokit: Octokit) {}

  async processPREvent(action: string, pr: any, repository: any) {
    const author = pr.user.login;
    const repo = repository.full_name;

    this.updateDeveloperActivity(author, {
      type: 'pr_' + action,
      timestamp: new Date(),
      repo,
      prNumber: pr.number,
      metadata: {
        additions: pr.additions,
        deletions: pr.deletions,
        files: pr.changed_files,
      },
    });

    if (action === 'closed' && pr.merged) {
      // Track performance metrics
      await this.trackPRPerformance(pr, repository);
    }
  }

  async processPushEvent(ref: string, repository: any, commits: any[]) {
    if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
      for (const commit of commits) {
        const author = commit.author?.username || commit.committer?.username;
        if (author) {
          this.updateDeveloperActivity(author, {
            type: 'commit',
            timestamp: new Date(commit.timestamp),
            repo: repository.full_name,
            metadata: {
              sha: commit.id,
              message: commit.message,
            },
          });
        }
      }
    }
  }

  async processWorkflowEvent(workflow: any, repository: any) {
    // Track CI/CD efficiency metrics
    if (workflow.conclusion) {
      this.teamMetrics.push({
        type: 'workflow',
        repo: repository.full_name,
        timestamp: new Date(workflow.updated_at),
        value: workflow.conclusion === 'success' ? 1 : 0,
        metadata: {
          duration:
            new Date(workflow.updated_at).getTime() -
            new Date(workflow.created_at).getTime(),
          actor: workflow.actor?.login,
        },
      });
    }
  }

  async getSPACEMetrics(
    repo: string,
    timeframe: string,
  ): Promise<SPACEMetrics> {
    const now = new Date();
    const timeframeMs = this.parseTimeframe(timeframe);
    const since = new Date(now.getTime() - timeframeMs);

    // Filter activity by timeframe and repo
    const activities = Array.from(this.developerActivity.values()).flatMap(
      (dev) =>
        dev.activities.filter(
          (a) => a.timestamp >= since && (repo === 'all' || a.repo === repo),
        ),
    );

    const metrics: SPACEMetrics = {
      satisfaction: await this.calculateSatisfaction(activities),
      performance: await this.calculatePerformance(activities, timeframeMs),
      activity: await this.calculateActivity(activities, timeframeMs),
      communication: await this.calculateCommunication(activities),
      efficiency: await this.calculateEfficiency(activities),
    };

    logger.info('SPACE metrics calculated', { repo, timeframe, metrics });
    return metrics;
  }

  private async calculateSatisfaction(activities: Activity[]): Promise<number> {
    // Simplified satisfaction calculation based on PR review sentiment
    const prEvents = activities.filter((a) => a.type.startsWith('pr_'));

    // In a real implementation, this would analyze:
    // - Review comment sentiment
    // - Time to first review
    // - Number of review iterations
    // - Developer survey responses

    // Mock calculation: higher activity = higher satisfaction (simplified)
    const avgPRsPerWeek = prEvents.length / 52; // assuming yearly data
    return Math.min(100, Math.max(0, avgPRsPerWeek * 10));
  }

  private async calculatePerformance(
    activities: Activity[],
    timeframeMs: number,
  ): Promise<SPACEMetrics['performance']> {
    const weeks = timeframeMs / (1000 * 60 * 60 * 24 * 7);
    const mergedPRs = activities.filter((a) => a.type === 'pr_closed').length;
    const commits = activities.filter((a) => a.type === 'commit').length;

    // Quality score based on workflow success rate
    const workflows = this.teamMetrics.filter((m) => m.type === 'workflow');
    const successRate =
      workflows.length > 0
        ? (workflows.filter((w) => w.value === 1).length / workflows.length) *
          100
        : 100;

    return {
      throughput: mergedPRs / weeks,
      velocity: commits / weeks,
      quality: successRate,
    };
  }

  private async calculateActivity(
    activities: Activity[],
    timeframeMs: number,
  ): Promise<SPACEMetrics['activity']> {
    const weeks = timeframeMs / (1000 * 60 * 60 * 24 * 7);
    const uniqueDevs =
      new Set(Array.from(this.developerActivity.keys())).size || 1;

    const commits = activities.filter((a) => a.type === 'commit').length;
    const prs = activities.filter((a) => a.type === 'pr_opened').length;
    const reviews = activities.filter((a) => a.type === 'pr_review').length;

    return {
      commitsPerDev: commits / uniqueDevs / weeks,
      prActivity: prs / weeks,
      codeReviews: reviews / weeks,
    };
  }

  private async calculateCommunication(
    activities: Activity[],
  ): Promise<SPACEMetrics['communication']> {
    // Mock communication metrics
    // In reality, would analyze:
    // - Time between PR creation and first review
    // - Cross-team collaboration patterns
    // - Discussion thread lengths
    // - Response times in issues/PRs

    const prEvents = activities.filter((a) => a.type.startsWith('pr_'));
    const avgResponseTime = 4; // Mock: 4 hours average response time
    const collaborationScore = Math.min(100, prEvents.length * 2); // Simple proxy

    return {
      reviewResponseTime: avgResponseTime,
      collaborationScore,
    };
  }

  private async calculateEfficiency(
    activities: Activity[],
  ): Promise<SPACEMetrics['efficiency']> {
    // Mock efficiency calculation
    // Real implementation would track:
    // - Time from first commit to merge
    // - Context switching frequency
    // - Deep work periods
    // - Meeting vs coding time ratio

    const workflows = this.teamMetrics.filter((m) => m.type === 'workflow');
    const avgWorkflowTime =
      workflows.length > 0
        ? workflows.reduce((sum, w) => sum + (w.metadata?.duration || 0), 0) /
          workflows.length /
          (1000 * 60 * 60)
        : 2; // hours

    return {
      flowTime: avgWorkflowTime,
      focusTime: 6, // Mock: 6 hours of focus time per day
    };
  }

  private async trackPRPerformance(pr: any, repository: any) {
    const openTime = new Date(pr.created_at);
    const mergeTime = new Date(pr.merged_at);
    const cycleTime = mergeTime.getTime() - openTime.getTime();

    this.teamMetrics.push({
      type: 'pr_cycle_time',
      repo: repository.full_name,
      timestamp: mergeTime,
      value: cycleTime / (1000 * 60 * 60), // hours
      metadata: {
        prNumber: pr.number,
        author: pr.user.login,
        additions: pr.additions,
        deletions: pr.deletions,
      },
    });
  }

  private updateDeveloperActivity(developer: string, activity: Activity) {
    if (!this.developerActivity.has(developer)) {
      this.developerActivity.set(developer, {
        login: developer,
        activities: [],
        totalCommits: 0,
        totalPRs: 0,
        totalReviews: 0,
      });
    }

    const devActivity = this.developerActivity.get(developer)!;
    devActivity.activities.push(activity);

    // Update counters
    switch (activity.type) {
      case 'commit':
        devActivity.totalCommits++;
        break;
      case 'pr_opened':
        devActivity.totalPRs++;
        break;
      case 'pr_review':
        devActivity.totalReviews++;
        break;
    }
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([dwm])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 30 * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  // Get individual developer metrics
  getDeveloperMetrics(
    developer: string,
    timeframe: string = '30d',
  ): DeveloperMetrics | null {
    const activity = this.developerActivity.get(developer);
    if (!activity) return null;

    const timeframeMs = this.parseTimeframe(timeframe);
    const since = new Date(Date.now() - timeframeMs);
    const recentActivities = activity.activities.filter(
      (a) => a.timestamp >= since,
    );

    const commits = recentActivities.filter((a) => a.type === 'commit').length;
    const prs = recentActivities.filter((a) => a.type === 'pr_opened').length;
    const reviews = recentActivities.filter(
      (a) => a.type === 'pr_review',
    ).length;

    const weeks = timeframeMs / (1000 * 60 * 60 * 24 * 7);

    return {
      developer,
      timeframe,
      commitsPerWeek: commits / weeks,
      prPerWeek: prs / weeks,
      reviewsPerWeek: reviews / weeks,
      totalActivity: recentActivities.length,
      activityScore: Math.min(100, recentActivities.length * 2),
    };
  }

  // Get team collaboration patterns
  getCollaborationPattern(timeframe: string = '30d'): CollaborationPattern {
    const timeframeMs = this.parseTimeframe(timeframe);
    const since = new Date(Date.now() - timeframeMs);

    const developers = Array.from(this.developerActivity.keys());
    const collaborations: Record<string, number> = {};

    // Simple collaboration tracking based on PR reviews
    // In reality, would track actual review interactions
    developers.forEach((dev) => {
      developers.forEach((other) => {
        if (dev !== other) {
          const key = [dev, other].sort().join('-');
          collaborations[key] = (collaborations[key] || 0) + 1;
        }
      });
    });

    return {
      timeframe,
      totalDevelopers: developers.length,
      collaborationPairs: Object.keys(collaborations).length,
      averageCollaborations:
        Object.values(collaborations).reduce((a, b) => a + b, 0) /
        developers.length,
      topCollaborators: Object.entries(collaborations)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([pair, count]) => ({ pair, interactions: count })),
    };
  }
}

interface Activity {
  type: string;
  timestamp: Date;
  repo: string;
  prNumber?: number;
  metadata?: any;
}

interface DeveloperActivity {
  login: string;
  activities: Activity[];
  totalCommits: number;
  totalPRs: number;
  totalReviews: number;
}

interface TeamMetrics {
  type: string;
  repo: string;
  timestamp: Date;
  value: number;
  metadata?: any;
}

interface DeveloperMetrics {
  developer: string;
  timeframe: string;
  commitsPerWeek: number;
  prPerWeek: number;
  reviewsPerWeek: number;
  totalActivity: number;
  activityScore: number;
}

interface CollaborationPattern {
  timeframe: string;
  totalDevelopers: number;
  collaborationPairs: number;
  averageCollaborations: number;
  topCollaborators: Array<{
    pair: string;
    interactions: number;
  }>;
}
