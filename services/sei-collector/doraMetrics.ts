import { Octokit } from '@octokit/rest';
import { logger } from '../../server/utils/logger';

export interface DORAMetrics {
  deploymentFrequency: number; // deploys per day
  leadTimeForChanges: number; // hours from commit to production
  changeFailureRate: number; // percentage
  timeToRestore: number; // hours (MTTR)
  totalPRs?: number;
  totalDeployments?: number;
  totalIncidents?: number;
}

export class DORAMetricsCollector {
  private prData: Map<number, PRData> = new Map();
  private deploymentData: DeploymentData[] = [];
  private incidentData: IncidentData[] = [];

  constructor(private octokit: Octokit) {}

  async processPREvent(action: string, pr: any, repository: any) {
    const prNumber = pr.number;
    const repo = repository.full_name;

    switch (action) {
      case 'opened':
        this.prData.set(prNumber, {
          number: prNumber,
          repo,
          openedAt: new Date(pr.created_at),
          closedAt: null,
          mergedAt: null,
          leadTimeHours: null,
          commits: [],
        });
        break;

      case 'closed':
        const existingPR = this.prData.get(prNumber);
        if (existingPR) {
          existingPR.closedAt = new Date(pr.closed_at);
          if (pr.merged_at) {
            existingPR.mergedAt = new Date(pr.merged_at);
            existingPR.leadTimeHours = this.calculateLeadTime(existingPR);
          }
        }
        break;
    }

    logger.debug('PR event processed', { action, prNumber, repo });
  }

  async processPushEvent(ref: string, repository: any, commits: any[]) {
    if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
      // Track commits to main branch for lead time calculation
      for (const commit of commits) {
        // Find associated PR for this commit
        const associatedPR = await this.findPRForCommit(
          repository.owner.login,
          repository.name,
          commit.id,
        );

        if (associatedPR) {
          const prData = this.prData.get(associatedPR.number);
          if (prData) {
            prData.commits.push({
              sha: commit.id,
              timestamp: new Date(commit.timestamp),
            });
          }
        }
      }
    }
  }

  async processDeploymentEvent(deployment: any, repository: any) {
    this.deploymentData.push({
      id: deployment.id,
      repo: repository.full_name,
      environment: deployment.environment,
      createdAt: new Date(deployment.created_at),
      status: deployment.statuses_url ? 'pending' : 'success',
      sha: deployment.sha,
    });

    logger.debug('Deployment event processed', {
      deploymentId: deployment.id,
      environment: deployment.environment,
    });
  }

  async processWorkflowEvent(workflow: any, repository: any) {
    // Track workflow runs for CI/CD performance
    if (workflow.conclusion === 'failure') {
      // Potential incident or change failure
      this.incidentData.push({
        id: workflow.id,
        repo: repository.full_name,
        type: 'workflow_failure',
        createdAt: new Date(workflow.created_at),
        resolvedAt: null, // Would be updated when re-run succeeds
        severity: 'medium',
      });
    }
  }

  async getDORAMetrics(repo: string, timeframe: string): Promise<DORAMetrics> {
    const now = new Date();
    const timeframeMs = this.parseTimeframe(timeframe);
    const since = new Date(now.getTime() - timeframeMs);

    // Filter data by timeframe
    const prs = Array.from(this.prData.values()).filter(
      (pr) => pr.openedAt >= since && (repo === 'all' || pr.repo === repo),
    );

    const deployments = this.deploymentData.filter(
      (d) => d.createdAt >= since && (repo === 'all' || d.repo === repo),
    );

    const incidents = this.incidentData.filter(
      (i) => i.createdAt >= since && (repo === 'all' || i.repo === repo),
    );

    // Calculate metrics
    const deploymentFrequency = this.calculateDeploymentFrequency(
      deployments,
      timeframeMs,
    );
    const leadTimeForChanges = this.calculateLeadTimeForChanges(prs);
    const changeFailureRate = this.calculateChangeFailureRate(
      deployments,
      incidents,
    );
    const timeToRestore = this.calculateTimeToRestore(incidents);

    const metrics: DORAMetrics = {
      deploymentFrequency,
      leadTimeForChanges,
      changeFailureRate,
      timeToRestore,
      totalPRs: prs.length,
      totalDeployments: deployments.length,
      totalIncidents: incidents.length,
    };

    logger.info('DORA metrics calculated', { repo, timeframe, metrics });
    return metrics;
  }

  private calculateLeadTime(pr: PRData): number | null {
    if (!pr.mergedAt || !pr.openedAt) return null;

    // Lead time from PR open to merge (simplified)
    const diffMs = pr.mergedAt.getTime() - pr.openedAt.getTime();
    return Math.round(diffMs / (1000 * 60 * 60)); // hours
  }

  private calculateDeploymentFrequency(
    deployments: DeploymentData[],
    timeframeMs: number,
  ): number {
    const days = timeframeMs / (1000 * 60 * 60 * 24);
    return deployments.length / days;
  }

  private calculateLeadTimeForChanges(prs: PRData[]): number {
    const mergedPRs = prs.filter((pr) => pr.leadTimeHours !== null);
    if (mergedPRs.length === 0) return 0;

    const totalLeadTime = mergedPRs.reduce(
      (sum, pr) => sum + (pr.leadTimeHours || 0),
      0,
    );
    return totalLeadTime / mergedPRs.length;
  }

  private calculateChangeFailureRate(
    deployments: DeploymentData[],
    incidents: IncidentData[],
  ): number {
    if (deployments.length === 0) return 0;

    // Simplified: count workflow failures as change failures
    const failures = incidents.filter(
      (i) => i.type === 'workflow_failure',
    ).length;
    return (failures / deployments.length) * 100;
  }

  private calculateTimeToRestore(incidents: IncidentData[]): number {
    const resolvedIncidents = incidents.filter((i) => i.resolvedAt !== null);
    if (resolvedIncidents.length === 0) return 0;

    const totalRestoreTime = resolvedIncidents.reduce((sum, incident) => {
      const restoreTimeMs =
        incident.resolvedAt!.getTime() - incident.createdAt.getTime();
      return sum + restoreTimeMs / (1000 * 60 * 60); // convert to hours
    }, 0);

    return totalRestoreTime / resolvedIncidents.length;
  }

  private async findPRForCommit(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<any> {
    try {
      const { data: prs } =
        await this.octokit.repos.listPullRequestsAssociatedWithCommit({
          owner,
          repo,
          commit_sha: sha,
        });

      return prs.length > 0 ? prs[0] : null;
    } catch (error) {
      logger.error('Failed to find PR for commit', { owner, repo, sha, error });
      return null;
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
}

interface PRData {
  number: number;
  repo: string;
  openedAt: Date;
  closedAt: Date | null;
  mergedAt: Date | null;
  leadTimeHours: number | null;
  commits: Array<{
    sha: string;
    timestamp: Date;
  }>;
}

interface DeploymentData {
  id: string;
  repo: string;
  environment: string;
  createdAt: Date;
  status: string;
  sha: string;
}

interface IncidentData {
  id: string;
  repo: string;
  type: string;
  createdAt: Date;
  resolvedAt: Date | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
