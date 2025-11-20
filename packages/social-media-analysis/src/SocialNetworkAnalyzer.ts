/**
 * Social media network analysis and bot detection
 */

import type { Graph, Node, Edge } from '@intelgraph/network-analysis';
import { GraphBuilder, CentralityMetrics } from '@intelgraph/network-analysis';
import { LouvainAlgorithm } from '@intelgraph/community-detection';

export interface SocialMediaProfile {
  id: string;
  username: string;
  followers: number;
  following: number;
  posts: number;
  accountAge: number; // days
  verified: boolean;
  bio?: string;
  location?: string;
  created: Date;
}

export interface BotScore {
  userId: string;
  score: number; // 0-1, higher = more likely bot
  features: {
    followRatio: number;
    activityRate: number;
    networkPosition: number;
    accountAge: number;
    contentDiversity: number;
  };
  classification: 'likely_bot' | 'suspicious' | 'likely_human';
}

export interface CoordinatedBehavior {
  type: 'coordinated_posting' | 'coordinated_engagement' | 'retweet_network';
  actors: Set<string>;
  confidence: number;
  timeWindow: { start: Date; end: Date };
  evidence: string[];
}

export class SocialNetworkAnalyzer {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Build follower network from social media profiles
   */
  static buildFollowerNetwork(
    profiles: SocialMediaProfile[],
    followRelationships: Array<{ follower: string; following: string }>
  ): Graph {
    const builder = new GraphBuilder(true, false);

    // Add users as nodes
    profiles.forEach(profile => {
      builder.addNode({
        id: profile.id,
        label: profile.username,
        attributes: {
          followers: profile.followers,
          following: profile.following,
          posts: profile.posts,
          accountAge: profile.accountAge,
          verified: profile.verified
        }
      });
    });

    // Add follow relationships as edges
    followRelationships.forEach(rel => {
      builder.addEdge({
        source: rel.follower,
        target: rel.following,
        directed: true
      });
    });

    return builder.build();
  }

  /**
   * Detect bot accounts using multiple heuristics
   */
  detectBots(profiles: Map<string, SocialMediaProfile>): Map<string, BotScore> {
    const botScores = new Map<string, BotScore>();
    const centrality = new CentralityMetrics(this.graph);

    this.graph.nodes.forEach((node, userId) => {
      const profile = profiles.get(userId);
      if (!profile) return;

      // Calculate features
      const followRatio = profile.followers > 0 ? profile.following / profile.followers : 10;
      const activityRate = profile.posts / Math.max(profile.accountAge, 1);

      // Network position (combination of centrality metrics)
      const pageRank = centrality.pageRank().get(userId) || 0;
      const networkPosition = pageRank;

      const accountAge = profile.accountAge;

      // Content diversity (placeholder - would analyze actual content)
      const contentDiversity = profile.verified ? 0.8 : 0.5;

      // Calculate bot score
      let score = 0;

      // High follow ratio is suspicious
      if (followRatio > 2) score += 0.25;
      if (followRatio > 5) score += 0.15;

      // Very high or very low activity is suspicious
      if (activityRate > 50 || activityRate < 0.1) score += 0.2;

      // New accounts are more suspicious
      if (accountAge < 30) score += 0.15;
      if (accountAge < 7) score += 0.15;

      // Low network position (isolated)
      if (networkPosition < 0.001) score += 0.1;

      // Low content diversity
      if (contentDiversity < 0.3) score += 0.15;

      // Verified accounts are likely human
      if (profile.verified) score = Math.max(0, score - 0.4);

      score = Math.min(1, score);

      const classification =
        score > 0.7 ? 'likely_bot' :
        score > 0.4 ? 'suspicious' :
        'likely_human';

      botScores.set(userId, {
        userId,
        score,
        features: {
          followRatio,
          activityRate,
          networkPosition,
          accountAge,
          contentDiversity
        },
        classification
      });
    });

    return botScores;
  }

  /**
   * Detect coordinated behavior patterns
   */
  detectCoordinatedBehavior(
    activities: Array<{
      userId: string;
      action: string;
      target?: string;
      timestamp: Date;
    }>,
    timeWindow = 3600000 // 1 hour in ms
  ): CoordinatedBehavior[] {
    const coordinated: CoordinatedBehavior[] = [];

    // Group activities by time windows
    const windows = this.groupByTimeWindow(activities, timeWindow);

    windows.forEach(({ start, end, activities: windowActivities }) => {
      // Detect coordinated posting
      const postingGroups = this.findCoordinatedPosting(windowActivities);
      postingGroups.forEach(group => {
        if (group.actors.size >= 3) {
          coordinated.push({
            type: 'coordinated_posting',
            actors: group.actors,
            confidence: group.confidence,
            timeWindow: { start, end },
            evidence: group.evidence
          });
        }
      });

      // Detect coordinated engagement
      const engagementGroups = this.findCoordinatedEngagement(windowActivities);
      engagementGroups.forEach(group => {
        if (group.actors.size >= 3) {
          coordinated.push({
            type: 'coordinated_engagement',
            actors: group.actors,
            confidence: group.confidence,
            timeWindow: { start, end },
            evidence: group.evidence
          });
        }
      });
    });

    return coordinated;
  }

  /**
   * Identify echo chambers in the network
   */
  identifyEchoChambers(): Array<{
    members: Set<string>;
    insularity: number; // 0-1, higher = more insular
    polarization: number;
  }> {
    const echoChambers: Array<{
      members: Set<string>;
      insularity: number;
      polarization: number;
    }> = [];

    // Detect communities
    const louvain = new LouvainAlgorithm(this.graph);
    const communities = louvain.detectCommunities();

    communities.communities.forEach(community => {
      // Calculate insularity (internal vs external edges)
      let internalEdges = 0;
      let externalEdges = 0;

      this.graph.edges.forEach(edge => {
        if (community.members.has(edge.source) && community.members.has(edge.target)) {
          internalEdges++;
        } else if (community.members.has(edge.source) || community.members.has(edge.target)) {
          externalEdges++;
        }
      });

      const totalEdges = internalEdges + externalEdges;
      const insularity = totalEdges > 0 ? internalEdges / totalEdges : 0;

      // High insularity indicates echo chamber
      if (insularity > 0.7 && community.members.size >= 5) {
        echoChambers.push({
          members: community.members,
          insularity,
          polarization: community.density || 0
        });
      }
    });

    return echoChambers;
  }

  /**
   * Analyze influence operations
   */
  analyzeInfluenceOperations(): Array<{
    type: 'amplification' | 'narrative_seeding' | 'astroturfing';
    actors: Set<string>;
    targets: Set<string>;
    confidence: number;
  }> {
    const operations: Array<{
      type: 'amplification' | 'narrative_seeding' | 'astroturfing';
      actors: Set<string>;
      targets: Set<string>;
      confidence: number;
    }> = [];

    // Detect amplification networks (hub-spoke patterns)
    const amplificationNetworks = this.detectAmplificationNetworks();
    amplificationNetworks.forEach(network => {
      operations.push({
        type: 'amplification',
        actors: network.amplifiers,
        targets: network.targets,
        confidence: network.confidence
      });
    });

    return operations;
  }

  /**
   * Group activities by time window
   */
  private groupByTimeWindow(
    activities: Array<{ userId: string; action: string; target?: string; timestamp: Date }>,
    windowSize: number
  ): Array<{
    start: Date;
    end: Date;
    activities: Array<{ userId: string; action: string; target?: string; timestamp: Date }>;
  }> {
    const sorted = [...activities].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const windows: Array<{
      start: Date;
      end: Date;
      activities: Array<{ userId: string; action: string; target?: string; timestamp: Date }>;
    }> = [];

    if (sorted.length === 0) return windows;

    let currentWindow = {
      start: sorted[0].timestamp,
      end: new Date(sorted[0].timestamp.getTime() + windowSize),
      activities: [sorted[0]]
    };

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].timestamp <= currentWindow.end) {
        currentWindow.activities.push(sorted[i]);
      } else {
        windows.push(currentWindow);
        currentWindow = {
          start: sorted[i].timestamp,
          end: new Date(sorted[i].timestamp.getTime() + windowSize),
          activities: [sorted[i]]
        };
      }
    }

    windows.push(currentWindow);
    return windows;
  }

  /**
   * Find coordinated posting patterns
   */
  private findCoordinatedPosting(
    activities: Array<{ userId: string; action: string; target?: string; timestamp: Date }>
  ): Array<{ actors: Set<string>; confidence: number; evidence: string[] }> {
    const groups: Array<{ actors: Set<string>; confidence: number; evidence: string[] }> = [];

    // Group by similar actions within short time
    const actionGroups = new Map<string, Set<string>>();

    activities.forEach(activity => {
      if (!actionGroups.has(activity.action)) {
        actionGroups.set(activity.action, new Set());
      }
      actionGroups.get(activity.action)!.add(activity.userId);
    });

    actionGroups.forEach((users, action) => {
      if (users.size >= 3) {
        groups.push({
          actors: users,
          confidence: Math.min(1, users.size / 10),
          evidence: [`${users.size} users performed similar action: ${action}`]
        });
      }
    });

    return groups;
  }

  /**
   * Find coordinated engagement patterns
   */
  private findCoordinatedEngagement(
    activities: Array<{ userId: string; action: string; target?: string; timestamp: Date }>
  ): Array<{ actors: Set<string>; confidence: number; evidence: string[] }> {
    const groups: Array<{ actors: Set<string>; confidence: number; evidence: string[] }> = [];

    // Group by same target
    const targetGroups = new Map<string, Set<string>>();

    activities.forEach(activity => {
      if (activity.target) {
        if (!targetGroups.has(activity.target)) {
          targetGroups.set(activity.target, new Set());
        }
        targetGroups.get(activity.target)!.add(activity.userId);
      }
    });

    targetGroups.forEach((users, target) => {
      if (users.size >= 3) {
        groups.push({
          actors: users,
          confidence: Math.min(1, users.size / 10),
          evidence: [`${users.size} users engaged with same target: ${target}`]
        });
      }
    });

    return groups;
  }

  /**
   * Detect amplification networks
   */
  private detectAmplificationNetworks(): Array<{
    amplifiers: Set<string>;
    targets: Set<string>;
    confidence: number;
  }> {
    const networks: Array<{
      amplifiers: Set<string>;
      targets: Set<string>;
      confidence: number;
    }> = [];

    // Find nodes with high out-degree and low in-degree (potential amplifiers)
    this.graph.nodes.forEach((_, nodeId) => {
      let outDegree = 0;
      let inDegree = 0;

      this.graph.edges.forEach(edge => {
        if (edge.source === nodeId) outDegree++;
        if (edge.target === nodeId) inDegree++;
      });

      // Potential amplifier: high out-degree, low in-degree
      if (outDegree > 10 && inDegree < 3) {
        const targets = new Set<string>();
        this.graph.edges.forEach(edge => {
          if (edge.source === nodeId) {
            targets.add(edge.target);
          }
        });

        if (targets.size >= 5) {
          networks.push({
            amplifiers: new Set([nodeId]),
            targets,
            confidence: Math.min(1, outDegree / 50)
          });
        }
      }
    });

    return networks;
  }
}
