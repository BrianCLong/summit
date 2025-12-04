/**
 * Coordinated Inauthentic Behavior (CIB) Detection
 * Identifies coordinated campaigns and inauthentic activity patterns
 */

export interface CIBDetectionResult {
  campaignId: string;
  accounts: string[];
  coordinationScore: number;
  inauthenticityScore: number;
  confidence: number;
  indicators: CIBIndicator[];
  timeframe: { start: Date; end: Date };
}

export interface CIBIndicator {
  type: string;
  description: string;
  affectedAccounts: string[];
  score: number;
}

export interface AccountBehavior {
  accountId: string;
  activities: Activity[];
  connections: string[];
}

export interface Activity {
  timestamp: Date;
  type: 'post' | 'share' | 'like' | 'follow' | 'comment';
  targetId: string;
  content?: string;
}

export class CIBDetector {
  async detectCIB(behaviors: AccountBehavior[]): Promise<CIBDetectionResult[]> {
    const campaigns: CIBDetectionResult[] = [];

    // Detect temporal coordination
    const temporalCampaigns = this.detectTemporalCoordination(behaviors);
    campaigns.push(...temporalCampaigns);

    // Detect content coordination
    const contentCampaigns = this.detectContentCoordination(behaviors);
    campaigns.push(...contentCampaigns);

    // Detect network coordination
    const networkCampaigns = this.detectNetworkCoordination(behaviors);
    campaigns.push(...networkCampaigns);

    // Merge overlapping campaigns
    return this.mergeCampaigns(campaigns);
  }

  private detectTemporalCoordination(
    behaviors: AccountBehavior[]
  ): CIBDetectionResult[] {
    const campaigns: CIBDetectionResult[] = [];
    const timeWindows = this.createTimeWindows(behaviors);

    for (const window of timeWindows) {
      const coordinatedAccounts = this.findTemporallyCoordinated(
        behaviors,
        window.start,
        window.end
      );

      if (coordinatedAccounts.length >= 3) {
        const indicators: CIBIndicator[] = [
          {
            type: 'temporal_coordination',
            description: `${coordinatedAccounts.length} accounts posting within narrow time window`,
            affectedAccounts: coordinatedAccounts,
            score: 0.4,
          },
        ];

        campaigns.push({
          campaignId: this.generateCampaignId('temporal', window.start),
          accounts: coordinatedAccounts,
          coordinationScore: this.calculateCoordinationScore(coordinatedAccounts.length),
          inauthenticityScore: 0.5,
          confidence: 0.6,
          indicators,
          timeframe: window,
        });
      }
    }

    return campaigns;
  }

  private detectContentCoordination(
    behaviors: AccountBehavior[]
  ): CIBDetectionResult[] {
    const campaigns: CIBDetectionResult[] = [];
    const contentGroups = this.groupBySimilarContent(behaviors);

    for (const group of contentGroups) {
      if (group.accounts.length >= 3) {
        const indicators: CIBIndicator[] = [
          {
            type: 'content_coordination',
            description: `${group.accounts.length} accounts posting similar content`,
            affectedAccounts: group.accounts,
            score: 0.5,
          },
        ];

        campaigns.push({
          campaignId: this.generateCampaignId('content', new Date()),
          accounts: group.accounts,
          coordinationScore: this.calculateCoordinationScore(group.accounts.length),
          inauthenticityScore: group.similarity,
          confidence: 0.7,
          indicators,
          timeframe: group.timeframe,
        });
      }
    }

    return campaigns;
  }

  private detectNetworkCoordination(
    behaviors: AccountBehavior[]
  ): CIBDetectionResult[] {
    const campaigns: CIBDetectionResult[] = [];

    // Build connection graph
    const graph = this.buildConnectionGraph(behaviors);

    // Find dense clusters (potential coordinated networks)
    const clusters = this.findDenseClusters(graph);

    for (const cluster of clusters) {
      if (cluster.length >= 3) {
        const indicators: CIBIndicator[] = [
          {
            type: 'network_coordination',
            description: `Dense network of ${cluster.length} interconnected accounts`,
            affectedAccounts: cluster,
            score: 0.4,
          },
        ];

        campaigns.push({
          campaignId: this.generateCampaignId('network', new Date()),
          accounts: cluster,
          coordinationScore: this.calculateNetworkCoordination(cluster, graph),
          inauthenticityScore: 0.6,
          confidence: 0.65,
          indicators,
          timeframe: { start: new Date(), end: new Date() },
        });
      }
    }

    return campaigns;
  }

  private createTimeWindows(
    behaviors: AccountBehavior[]
  ): Array<{ start: Date; end: Date }> {
    const allTimestamps: Date[] = [];

    for (const behavior of behaviors) {
      for (const activity of behavior.activities) {
        allTimestamps.push(activity.timestamp);
      }
    }

    allTimestamps.sort((a, b) => a.getTime() - b.getTime());

    const windows: Array<{ start: Date; end: Date }> = [];
    const windowSize = 60 * 60 * 1000; // 1 hour

    for (let i = 0; i < allTimestamps.length; i++) {
      const start = allTimestamps[i];
      const end = new Date(start.getTime() + windowSize);
      windows.push({ start, end });
    }

    return windows;
  }

  private findTemporallyCoordinated(
    behaviors: AccountBehavior[],
    start: Date,
    end: Date
  ): string[] {
    const coordinatedAccounts = new Set<string>();
    const timeThreshold = 5 * 60 * 1000; // 5 minutes

    for (const behavior of behaviors) {
      const activitiesInWindow = behavior.activities.filter(
        activity =>
          activity.timestamp >= start &&
          activity.timestamp <= end
      );

      if (activitiesInWindow.length > 0) {
        coordinatedAccounts.add(behavior.accountId);
      }
    }

    return Array.from(coordinatedAccounts);
  }

  private groupBySimilarContent(
    behaviors: AccountBehavior[]
  ): Array<{ accounts: string[]; similarity: number; timeframe: { start: Date; end: Date } }> {
    const groups: Array<{
      accounts: string[];
      similarity: number;
      timeframe: { start: Date; end: Date };
    }> = [];

    const contentMap = new Map<string, string[]>();

    for (const behavior of behaviors) {
      for (const activity of behavior.activities) {
        if (activity.content) {
          const normalized = this.normalizeContent(activity.content);
          if (!contentMap.has(normalized)) {
            contentMap.set(normalized, []);
          }
          contentMap.get(normalized)!.push(behavior.accountId);
        }
      }
    }

    for (const [content, accounts] of contentMap.entries()) {
      if (accounts.length >= 3) {
        groups.push({
          accounts: [...new Set(accounts)],
          similarity: 0.9,
          timeframe: { start: new Date(), end: new Date() },
        });
      }
    }

    return groups;
  }

  private buildConnectionGraph(
    behaviors: AccountBehavior[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const behavior of behaviors) {
      if (!graph.has(behavior.accountId)) {
        graph.set(behavior.accountId, new Set());
      }

      for (const connection of behavior.connections) {
        graph.get(behavior.accountId)!.add(connection);
      }
    }

    return graph;
  }

  private findDenseClusters(graph: Map<string, Set<string>>): string[][] {
    const clusters: string[][] = [];
    const visited = new Set<string>();

    for (const [accountId, connections] of graph.entries()) {
      if (visited.has(accountId)) continue;

      // Find densely connected subgraph
      const cluster = this.expandCluster(accountId, graph, visited);

      if (cluster.length >= 3) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private expandCluster(
    startId: string,
    graph: Map<string, Set<string>>,
    visited: Set<string>
  ): string[] {
    const cluster = [startId];
    visited.add(startId);

    const connections = graph.get(startId) || new Set();

    for (const connectedId of connections) {
      if (!visited.has(connectedId)) {
        const connectedConnections = graph.get(connectedId) || new Set();

        // Check if densely connected to cluster
        let connectionCount = 0;
        for (const clusterId of cluster) {
          if (connectedConnections.has(clusterId)) {
            connectionCount++;
          }
        }

        // If connected to > 50% of cluster, add to cluster
        if (connectionCount / cluster.length > 0.5) {
          cluster.push(connectedId);
          visited.add(connectedId);
        }
      }
    }

    return cluster;
  }

  private calculateCoordinationScore(accountCount: number): number {
    // More accounts = higher coordination score
    return Math.min(accountCount / 10, 1);
  }

  private calculateNetworkCoordination(
    accounts: string[],
    graph: Map<string, Set<string>>
  ): number {
    let totalConnections = 0;
    const maxPossibleConnections = (accounts.length * (accounts.length - 1)) / 2;

    for (const account of accounts) {
      const connections = graph.get(account) || new Set();
      for (const other of accounts) {
        if (account !== other && connections.has(other)) {
          totalConnections++;
        }
      }
    }

    return totalConnections / (maxPossibleConnections * 2); // Divide by 2 for bidirectional
  }

  private normalizeContent(content: string): string {
    return content.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private generateCampaignId(type: string, timestamp: Date): string {
    return `cib_${type}_${timestamp.getTime()}`;
  }

  private mergeCampaigns(campaigns: CIBDetectionResult[]): CIBDetectionResult[] {
    // Simple merge - in production, use more sophisticated clustering
    const merged = new Map<string, CIBDetectionResult>();

    for (const campaign of campaigns) {
      const key = campaign.accounts.sort().join('_');

      if (!merged.has(key)) {
        merged.set(key, campaign);
      } else {
        const existing = merged.get(key)!;
        existing.indicators.push(...campaign.indicators);
        existing.coordinationScore = Math.max(
          existing.coordinationScore,
          campaign.coordinationScore
        );
        existing.inauthenticityScore = Math.max(
          existing.inauthenticityScore,
          campaign.inauthenticityScore
        );
      }
    }

    return Array.from(merged.values());
  }
}
