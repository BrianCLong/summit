"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPACEMetricsCollector = void 0;
const logger_1 = require("../../server/utils/logger");
class SPACEMetricsCollector {
    octokit;
    developerActivity = new Map();
    teamMetrics = [];
    constructor(octokit) {
        this.octokit = octokit;
    }
    async processPREvent(action, pr, repository) {
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
    async processPushEvent(ref, repository, commits) {
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
    async processWorkflowEvent(workflow, repository) {
        // Track CI/CD efficiency metrics
        if (workflow.conclusion) {
            this.teamMetrics.push({
                type: 'workflow',
                repo: repository.full_name,
                timestamp: new Date(workflow.updated_at),
                value: workflow.conclusion === 'success' ? 1 : 0,
                metadata: {
                    duration: new Date(workflow.updated_at).getTime() -
                        new Date(workflow.created_at).getTime(),
                    actor: workflow.actor?.login,
                },
            });
        }
    }
    async getSPACEMetrics(repo, timeframe) {
        const now = new Date();
        const timeframeMs = this.parseTimeframe(timeframe);
        const since = new Date(now.getTime() - timeframeMs);
        // Filter activity by timeframe and repo
        const activities = Array.from(this.developerActivity.values()).flatMap((dev) => dev.activities.filter((a) => a.timestamp >= since && (repo === 'all' || a.repo === repo)));
        const metrics = {
            satisfaction: await this.calculateSatisfaction(activities),
            performance: await this.calculatePerformance(activities, timeframeMs),
            activity: await this.calculateActivity(activities, timeframeMs),
            communication: await this.calculateCommunication(activities),
            efficiency: await this.calculateEfficiency(activities),
        };
        logger_1.logger.info('SPACE metrics calculated', { repo, timeframe, metrics });
        return metrics;
    }
    async calculateSatisfaction(activities) {
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
    async calculatePerformance(activities, timeframeMs) {
        const weeks = timeframeMs / (1000 * 60 * 60 * 24 * 7);
        const mergedPRs = activities.filter((a) => a.type === 'pr_closed').length;
        const commits = activities.filter((a) => a.type === 'commit').length;
        // Quality score based on workflow success rate
        const workflows = this.teamMetrics.filter((m) => m.type === 'workflow');
        const successRate = workflows.length > 0
            ? (workflows.filter((w) => w.value === 1).length / workflows.length) *
                100
            : 100;
        return {
            throughput: mergedPRs / weeks,
            velocity: commits / weeks,
            quality: successRate,
        };
    }
    async calculateActivity(activities, timeframeMs) {
        const weeks = timeframeMs / (1000 * 60 * 60 * 24 * 7);
        const uniqueDevs = new Set(Array.from(this.developerActivity.keys())).size || 1;
        const commits = activities.filter((a) => a.type === 'commit').length;
        const prs = activities.filter((a) => a.type === 'pr_opened').length;
        const reviews = activities.filter((a) => a.type === 'pr_review').length;
        return {
            commitsPerDev: commits / uniqueDevs / weeks,
            prActivity: prs / weeks,
            codeReviews: reviews / weeks,
        };
    }
    async calculateCommunication(activities) {
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
    async calculateEfficiency(activities) {
        // Mock efficiency calculation
        // Real implementation would track:
        // - Time from first commit to merge
        // - Context switching frequency
        // - Deep work periods
        // - Meeting vs coding time ratio
        const workflows = this.teamMetrics.filter((m) => m.type === 'workflow');
        const avgWorkflowTime = workflows.length > 0
            ? workflows.reduce((sum, w) => sum + (w.metadata?.duration || 0), 0) /
                workflows.length /
                (1000 * 60 * 60)
            : 2; // hours
        return {
            flowTime: avgWorkflowTime,
            focusTime: 6, // Mock: 6 hours of focus time per day
        };
    }
    async trackPRPerformance(pr, repository) {
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
    updateDeveloperActivity(developer, activity) {
        if (!this.developerActivity.has(developer)) {
            this.developerActivity.set(developer, {
                login: developer,
                activities: [],
                totalCommits: 0,
                totalPRs: 0,
                totalReviews: 0,
            });
        }
        const devActivity = this.developerActivity.get(developer);
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
    parseTimeframe(timeframe) {
        const match = timeframe.match(/^(\d+)([dwm])$/);
        if (!match)
            return 7 * 24 * 60 * 60 * 1000; // default 7 days
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
    getDeveloperMetrics(developer, timeframe = '30d') {
        const activity = this.developerActivity.get(developer);
        if (!activity)
            return null;
        const timeframeMs = this.parseTimeframe(timeframe);
        const since = new Date(Date.now() - timeframeMs);
        const recentActivities = activity.activities.filter((a) => a.timestamp >= since);
        const commits = recentActivities.filter((a) => a.type === 'commit').length;
        const prs = recentActivities.filter((a) => a.type === 'pr_opened').length;
        const reviews = recentActivities.filter((a) => a.type === 'pr_review').length;
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
    getCollaborationPattern(timeframe = '30d') {
        const timeframeMs = this.parseTimeframe(timeframe);
        const since = new Date(Date.now() - timeframeMs);
        const developers = Array.from(this.developerActivity.keys());
        const collaborations = {};
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
            averageCollaborations: Object.values(collaborations).reduce((a, b) => a + b, 0) /
                developers.length,
            topCollaborators: Object.entries(collaborations)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([pair, count]) => ({ pair, interactions: count })),
        };
    }
}
exports.SPACEMetricsCollector = SPACEMetricsCollector;
