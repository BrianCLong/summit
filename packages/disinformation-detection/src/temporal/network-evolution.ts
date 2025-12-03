/**
 * Temporal Network Evolution Analyzer
 * Tracks how disinformation networks evolve over time
 */

export interface NetworkEvolutionAnalysis {
  snapshots: NetworkSnapshot[];
  evolution: EvolutionMetrics;
  patterns: EvolutionPattern[];
  predictions: EvolutionPrediction[];
  anomalies: TemporalAnomaly[];
  campaigns: CampaignTimeline[];
}

export interface NetworkSnapshot {
  timestamp: Date;
  nodes: NodeState[];
  edges: EdgeState[];
  metrics: SnapshotMetrics;
  clusters: ClusterState[];
}

export interface NodeState {
  id: string;
  type: NodeType;
  status: NodeStatus;
  influence: number;
  activity: number;
  connections: number;
  authenticity: number;
  attributes: Record<string, any>;
}

export enum NodeType {
  ORGANIC = 'organic',
  BOT = 'bot',
  CYBORG = 'cyborg',
  AMPLIFIER = 'amplifier',
  COORDINATOR = 'coordinator',
  SUPERSPREADER = 'superspreader',
}

export enum NodeStatus {
  ACTIVE = 'active',
  DORMANT = 'dormant',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  NEW = 'new',
}

export interface EdgeState {
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  created: Date;
  lastActive: Date;
  interactions: number;
}

export enum EdgeType {
  FOLLOW = 'follow',
  RETWEET = 'retweet',
  MENTION = 'mention',
  REPLY = 'reply',
  QUOTE = 'quote',
  COORDINATION = 'coordination',
}

export interface SnapshotMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgClustering: number;
  avgPathLength: number;
  modularity: number;
  centralityGini: number;
  botRatio: number;
}

export interface ClusterState {
  id: string;
  nodes: string[];
  coherence: number;
  narrative?: string;
  coordination: number;
  persistence: number;
}

export interface EvolutionMetrics {
  growthRate: GrowthMetrics;
  stability: StabilityMetrics;
  transformation: TransformationMetrics;
  resilience: ResilienceMetrics;
}

export interface GrowthMetrics {
  nodeGrowth: number;
  edgeGrowth: number;
  influenceGrowth: number;
  reachGrowth: number;
  velocity: number;
  acceleration: number;
}

export interface StabilityMetrics {
  coreStability: number;
  peripheryChurn: number;
  clusterPersistence: number;
  narrativeConsistency: number;
}

export interface TransformationMetrics {
  structuralChange: number;
  topologyShifts: TopologyShift[];
  roleTransitions: RoleTransition[];
  narrativePivots: NarrativePivot[];
}

export interface TopologyShift {
  timestamp: Date;
  type: 'centralization' | 'decentralization' | 'fragmentation' | 'consolidation';
  magnitude: number;
  affectedNodes: string[];
}

export interface RoleTransition {
  nodeId: string;
  fromRole: NodeType;
  toRole: NodeType;
  timestamp: Date;
  confidence: number;
}

export interface NarrativePivot {
  timestamp: Date;
  fromNarrative: string;
  toNarrative: string;
  affectedClusters: string[];
  abruptness: number;
}

export interface ResilienceMetrics {
  recoveryRate: number;
  adaptability: number;
  redundancy: number;
  antifragility: number;
}

export interface EvolutionPattern {
  type: PatternType;
  confidence: number;
  startTime: Date;
  endTime?: Date;
  description: string;
  indicators: string[];
  affectedNodes: string[];
}

export enum PatternType {
  ASTROTURFING_BUILDUP = 'astroturfing_buildup',
  COORDINATED_SURGE = 'coordinated_surge',
  DORMANCY_AWAKENING = 'dormancy_awakening',
  NETWORK_HIJACKING = 'network_hijacking',
  SLEEPER_ACTIVATION = 'sleeper_activation',
  DECOY_DISTRACTION = 'decoy_distraction',
  NARRATIVE_INJECTION = 'narrative_injection',
  INFLUENCE_LAUNDERING = 'influence_laundering',
}

export interface EvolutionPrediction {
  type: PredictionType;
  probability: number;
  timeframe: { start: Date; end: Date };
  impact: ImpactAssessment;
  indicators: string[];
  preventiveActions: string[];
}

export enum PredictionType {
  SURGE_IMMINENT = 'surge_imminent',
  NETWORK_EXPANSION = 'network_expansion',
  NARRATIVE_SHIFT = 'narrative_shift',
  COORDINATION_INCREASE = 'coordination_increase',
  DORMANCY_PERIOD = 'dormancy_period',
  PLATFORM_MIGRATION = 'platform_migration',
}

export interface ImpactAssessment {
  reach: number;
  engagement: number;
  viralPotential: number;
  persistenceLikelihood: number;
  countermeasureDifficulty: number;
}

export interface TemporalAnomaly {
  timestamp: Date;
  type: AnomalyType;
  severity: number;
  affectedMetrics: string[];
  possibleCauses: string[];
  relatedNodes: string[];
}

export enum AnomalyType {
  SUDDEN_GROWTH = 'sudden_growth',
  MASS_ACTIVATION = 'mass_activation',
  COORDINATED_POSTING = 'coordinated_posting',
  UNNATURAL_TIMING = 'unnatural_timing',
  CONTENT_FLOODING = 'content_flooding',
  NETWORK_RESET = 'network_reset',
}

export interface CampaignTimeline {
  campaignId: string;
  phases: CampaignPhase[];
  overallDuration: number;
  currentPhase: string;
  evolutionTrajectory: TrajectoryPoint[];
}

export interface CampaignPhase {
  name: string;
  startTime: Date;
  endTime?: Date;
  characteristics: string[];
  metrics: PhaseMetrics;
}

export interface PhaseMetrics {
  activity: number;
  coordination: number;
  reach: number;
  effectiveness: number;
}

export interface TrajectoryPoint {
  timestamp: Date;
  influence: number;
  reach: number;
  coordination: number;
}

export class TemporalNetworkEvolutionAnalyzer {
  private snapshots: NetworkSnapshot[] = [];
  private windowSize: number = 24 * 60 * 60 * 1000; // 24 hours
  private detectionThresholds: DetectionThresholds;

  constructor(config?: { windowSize?: number; thresholds?: Partial<DetectionThresholds> }) {
    if (config?.windowSize) this.windowSize = config.windowSize;
    this.detectionThresholds = {
      growthAnomaly: 2.0,
      coordinationThreshold: 0.7,
      activationThreshold: 0.5,
      narrativeShiftThreshold: 0.6,
      ...config?.thresholds,
    };
  }

  /**
   * Analyze network evolution over time
   */
  async analyzeEvolution(
    snapshots: NetworkSnapshot[]
  ): Promise<NetworkEvolutionAnalysis> {
    this.snapshots = snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate evolution metrics
    const evolution = this.calculateEvolutionMetrics();

    // Detect patterns
    const patterns = this.detectPatterns();

    // Generate predictions
    const predictions = this.generatePredictions(evolution, patterns);

    // Detect anomalies
    const anomalies = this.detectAnomalies();

    // Build campaign timelines
    const campaigns = this.buildCampaignTimelines(patterns);

    return {
      snapshots: this.snapshots,
      evolution,
      patterns,
      predictions,
      anomalies,
      campaigns,
    };
  }

  /**
   * Calculate comprehensive evolution metrics
   */
  private calculateEvolutionMetrics(): EvolutionMetrics {
    const growthRate = this.calculateGrowthMetrics();
    const stability = this.calculateStabilityMetrics();
    const transformation = this.calculateTransformationMetrics();
    const resilience = this.calculateResilienceMetrics();

    return { growthRate, stability, transformation, resilience };
  }

  private calculateGrowthMetrics(): GrowthMetrics {
    if (this.snapshots.length < 2) {
      return {
        nodeGrowth: 0,
        edgeGrowth: 0,
        influenceGrowth: 0,
        reachGrowth: 0,
        velocity: 0,
        acceleration: 0,
      };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const duration = last.timestamp.getTime() - first.timestamp.getTime();

    const nodeGrowth = (last.metrics.nodeCount - first.metrics.nodeCount) / first.metrics.nodeCount;
    const edgeGrowth = (last.metrics.edgeCount - first.metrics.edgeCount) / Math.max(first.metrics.edgeCount, 1);

    // Calculate influence growth
    const firstInfluence = first.nodes.reduce((sum, n) => sum + n.influence, 0);
    const lastInfluence = last.nodes.reduce((sum, n) => sum + n.influence, 0);
    const influenceGrowth = (lastInfluence - firstInfluence) / Math.max(firstInfluence, 1);

    // Calculate velocity and acceleration
    const velocities: number[] = [];
    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];
      const dt = curr.timestamp.getTime() - prev.timestamp.getTime();
      const dNodes = curr.metrics.nodeCount - prev.metrics.nodeCount;
      velocities.push(dNodes / (dt / 3600000)); // nodes per hour
    }

    const velocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

    let acceleration = 0;
    if (velocities.length > 1) {
      const accelerations: number[] = [];
      for (let i = 1; i < velocities.length; i++) {
        accelerations.push(velocities[i] - velocities[i - 1]);
      }
      acceleration = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    }

    return {
      nodeGrowth,
      edgeGrowth,
      influenceGrowth,
      reachGrowth: influenceGrowth * 0.8,
      velocity,
      acceleration,
    };
  }

  private calculateStabilityMetrics(): StabilityMetrics {
    if (this.snapshots.length < 2) {
      return { coreStability: 1, peripheryChurn: 0, clusterPersistence: 1, narrativeConsistency: 1 };
    }

    // Calculate core stability (nodes present throughout)
    const allNodeIds = new Set<string>();
    const nodePersistence = new Map<string, number>();

    for (const snapshot of this.snapshots) {
      for (const node of snapshot.nodes) {
        allNodeIds.add(node.id);
        nodePersistence.set(node.id, (nodePersistence.get(node.id) || 0) + 1);
      }
    }

    const persistentNodes = Array.from(nodePersistence.entries())
      .filter(([, count]) => count === this.snapshots.length);
    const coreStability = persistentNodes.length / allNodeIds.size;

    // Calculate periphery churn
    let totalJoins = 0;
    let totalLeaves = 0;
    for (let i = 1; i < this.snapshots.length; i++) {
      const prevIds = new Set(this.snapshots[i - 1].nodes.map(n => n.id));
      const currIds = new Set(this.snapshots[i].nodes.map(n => n.id));

      for (const id of currIds) if (!prevIds.has(id)) totalJoins++;
      for (const id of prevIds) if (!currIds.has(id)) totalLeaves++;
    }
    const peripheryChurn = (totalJoins + totalLeaves) / (this.snapshots.length * allNodeIds.size);

    // Calculate cluster persistence
    const clusterIds = new Set<string>();
    const clusterPersistenceMap = new Map<string, number>();
    for (const snapshot of this.snapshots) {
      for (const cluster of snapshot.clusters) {
        clusterIds.add(cluster.id);
        clusterPersistenceMap.set(cluster.id, (clusterPersistenceMap.get(cluster.id) || 0) + 1);
      }
    }
    const persistentClusters = Array.from(clusterPersistenceMap.values())
      .filter(count => count >= this.snapshots.length * 0.8);
    const clusterPersistence = persistentClusters.length / Math.max(clusterIds.size, 1);

    return {
      coreStability,
      peripheryChurn,
      clusterPersistence,
      narrativeConsistency: clusterPersistence * 0.9,
    };
  }

  private calculateTransformationMetrics(): TransformationMetrics {
    const topologyShifts: TopologyShift[] = [];
    const roleTransitions: RoleTransition[] = [];
    const narrativePivots: NarrativePivot[] = [];

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];

      // Detect topology shifts
      const densityChange = curr.metrics.density - prev.metrics.density;
      if (Math.abs(densityChange) > 0.1) {
        topologyShifts.push({
          timestamp: curr.timestamp,
          type: densityChange > 0 ? 'consolidation' : 'fragmentation',
          magnitude: Math.abs(densityChange),
          affectedNodes: curr.nodes.slice(0, 10).map(n => n.id),
        });
      }

      // Detect role transitions
      const prevNodeMap = new Map(prev.nodes.map(n => [n.id, n]));
      for (const node of curr.nodes) {
        const prevNode = prevNodeMap.get(node.id);
        if (prevNode && prevNode.type !== node.type) {
          roleTransitions.push({
            nodeId: node.id,
            fromRole: prevNode.type,
            toRole: node.type,
            timestamp: curr.timestamp,
            confidence: 0.8,
          });
        }
      }
    }

    // Calculate overall structural change
    const structuralChange = this.calculateStructuralChange();

    return {
      structuralChange,
      topologyShifts,
      roleTransitions,
      narrativePivots,
    };
  }

  private calculateStructuralChange(): number {
    if (this.snapshots.length < 2) return 0;

    let totalChange = 0;
    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];

      const densityChange = Math.abs(curr.metrics.density - prev.metrics.density);
      const clusteringChange = Math.abs(curr.metrics.avgClustering - prev.metrics.avgClustering);
      const modularityChange = Math.abs(curr.metrics.modularity - prev.metrics.modularity);

      totalChange += (densityChange + clusteringChange + modularityChange) / 3;
    }

    return totalChange / (this.snapshots.length - 1);
  }

  private calculateResilienceMetrics(): ResilienceMetrics {
    // Simplified resilience calculation
    const stability = this.calculateStabilityMetrics();

    return {
      recoveryRate: stability.coreStability * 0.8,
      adaptability: 1 - stability.narrativeConsistency,
      redundancy: stability.clusterPersistence,
      antifragility: stability.coreStability * (1 - stability.peripheryChurn),
    };
  }

  /**
   * Detect evolution patterns
   */
  private detectPatterns(): EvolutionPattern[] {
    const patterns: EvolutionPattern[] = [];

    patterns.push(...this.detectAstroturfingBuildup());
    patterns.push(...this.detectCoordinatedSurge());
    patterns.push(...this.detectSleeperActivation());
    patterns.push(...this.detectNarrativeInjection());

    return patterns;
  }

  private detectAstroturfingBuildup(): EvolutionPattern[] {
    const patterns: EvolutionPattern[] = [];

    // Look for gradual accumulation of low-authenticity nodes
    for (let i = 5; i < this.snapshots.length; i++) {
      const window = this.snapshots.slice(i - 5, i + 1);
      const botRatios = window.map(s => s.metrics.botRatio);

      // Check for steady increase
      let increasing = true;
      for (let j = 1; j < botRatios.length; j++) {
        if (botRatios[j] < botRatios[j - 1]) {
          increasing = false;
          break;
        }
      }

      if (increasing && botRatios[botRatios.length - 1] > 0.3) {
        patterns.push({
          type: PatternType.ASTROTURFING_BUILDUP,
          confidence: 0.85,
          startTime: window[0].timestamp,
          endTime: window[window.length - 1].timestamp,
          description: 'Gradual accumulation of inauthentic accounts detected',
          indicators: ['Increasing bot ratio', 'Similar account creation patterns'],
          affectedNodes: window[window.length - 1].nodes
            .filter(n => n.type === NodeType.BOT)
            .map(n => n.id)
            .slice(0, 20),
        });
      }
    }

    return patterns;
  }

  private detectCoordinatedSurge(): EvolutionPattern[] {
    const patterns: EvolutionPattern[] = [];

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];

      const activityIncrease = curr.nodes.reduce((sum, n) => sum + n.activity, 0) /
        Math.max(prev.nodes.reduce((sum, n) => sum + n.activity, 0), 1);

      if (activityIncrease > 3) {
        // Check for coordination
        const avgCoordination = curr.clusters.reduce((sum, c) => sum + c.coordination, 0) /
          Math.max(curr.clusters.length, 1);

        if (avgCoordination > this.detectionThresholds.coordinationThreshold) {
          patterns.push({
            type: PatternType.COORDINATED_SURGE,
            confidence: Math.min(activityIncrease / 5, 0.95),
            startTime: curr.timestamp,
            description: `${(activityIncrease * 100).toFixed(0)}% activity surge with high coordination`,
            indicators: ['Sudden activity increase', 'High cluster coordination', 'Synchronized timing'],
            affectedNodes: curr.nodes
              .sort((a, b) => b.activity - a.activity)
              .slice(0, 20)
              .map(n => n.id),
          });
        }
      }
    }

    return patterns;
  }

  private detectSleeperActivation(): EvolutionPattern[] {
    const patterns: EvolutionPattern[] = [];

    // Track dormant nodes that suddenly become active
    const dormantHistory = new Map<string, number>();

    for (let i = 0; i < this.snapshots.length; i++) {
      const snapshot = this.snapshots[i];
      const activatedSleepers: string[] = [];

      for (const node of snapshot.nodes) {
        const dormantCount = dormantHistory.get(node.id) || 0;

        if (node.status === NodeStatus.DORMANT || node.activity < 0.1) {
          dormantHistory.set(node.id, dormantCount + 1);
        } else if (dormantCount >= 5 && node.activity > 0.5) {
          activatedSleepers.push(node.id);
          dormantHistory.set(node.id, 0);
        }
      }

      if (activatedSleepers.length >= 10) {
        patterns.push({
          type: PatternType.SLEEPER_ACTIVATION,
          confidence: 0.8,
          startTime: snapshot.timestamp,
          description: `${activatedSleepers.length} dormant accounts simultaneously activated`,
          indicators: ['Long dormancy period', 'Sudden high activity', 'Coordinated timing'],
          affectedNodes: activatedSleepers,
        });
      }
    }

    return patterns;
  }

  private detectNarrativeInjection(): EvolutionPattern[] {
    const patterns: EvolutionPattern[] = [];

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];

      // Check for new narratives appearing in clusters
      const prevNarratives = new Set(prev.clusters.filter(c => c.narrative).map(c => c.narrative));
      const newNarratives = curr.clusters
        .filter(c => c.narrative && !prevNarratives.has(c.narrative))
        .map(c => c.narrative!);

      if (newNarratives.length > 0) {
        const affectedClusters = curr.clusters.filter(c => newNarratives.includes(c.narrative!));
        const avgCoordination = affectedClusters.reduce((sum, c) => sum + c.coordination, 0) /
          Math.max(affectedClusters.length, 1);

        if (avgCoordination > this.detectionThresholds.narrativeShiftThreshold) {
          patterns.push({
            type: PatternType.NARRATIVE_INJECTION,
            confidence: avgCoordination,
            startTime: curr.timestamp,
            description: `New coordinated narrative detected: "${newNarratives[0]}"`,
            indicators: ['New narrative emergence', 'High coordination', 'Rapid spread'],
            affectedNodes: affectedClusters.flatMap(c => c.nodes).slice(0, 20),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Generate evolution predictions
   */
  private generatePredictions(
    evolution: EvolutionMetrics,
    patterns: EvolutionPattern[]
  ): EvolutionPrediction[] {
    const predictions: EvolutionPrediction[] = [];
    const now = new Date();

    // Predict surge based on growth metrics
    if (evolution.growthRate.acceleration > 0.5) {
      predictions.push({
        type: PredictionType.SURGE_IMMINENT,
        probability: Math.min(0.5 + evolution.growthRate.acceleration * 0.3, 0.9),
        timeframe: {
          start: now,
          end: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        impact: {
          reach: evolution.growthRate.velocity * 100,
          engagement: 0.7,
          viralPotential: evolution.growthRate.acceleration,
          persistenceLikelihood: 0.6,
          countermeasureDifficulty: 0.7,
        },
        indicators: ['Accelerating growth', 'Increasing coordination'],
        preventiveActions: [
          'Increase monitoring frequency',
          'Prepare content moderation resources',
          'Alert fact-checking partners',
        ],
      });
    }

    // Predict network expansion
    if (evolution.growthRate.nodeGrowth > 0.5) {
      predictions.push({
        type: PredictionType.NETWORK_EXPANSION,
        probability: Math.min(0.6 + evolution.growthRate.nodeGrowth * 0.2, 0.85),
        timeframe: {
          start: now,
          end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        impact: {
          reach: evolution.growthRate.reachGrowth * 200,
          engagement: 0.6,
          viralPotential: 0.7,
          persistenceLikelihood: 0.8,
          countermeasureDifficulty: 0.6,
        },
        indicators: ['Sustained node growth', 'New cluster formation'],
        preventiveActions: [
          'Monitor new account creation',
          'Track cluster formation patterns',
          'Identify potential coordinators',
        ],
      });
    }

    return predictions;
  }

  /**
   * Detect temporal anomalies
   */
  private detectAnomalies(): TemporalAnomaly[] {
    const anomalies: TemporalAnomaly[] = [];

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];

      // Sudden growth anomaly
      const nodeGrowth = (curr.metrics.nodeCount - prev.metrics.nodeCount) / prev.metrics.nodeCount;
      if (nodeGrowth > this.detectionThresholds.growthAnomaly) {
        anomalies.push({
          timestamp: curr.timestamp,
          type: AnomalyType.SUDDEN_GROWTH,
          severity: Math.min(nodeGrowth / 3, 1),
          affectedMetrics: ['nodeCount', 'edgeCount'],
          possibleCauses: ['Coordinated account creation', 'Bot network activation'],
          relatedNodes: curr.nodes
            .filter(n => n.status === NodeStatus.NEW)
            .map(n => n.id)
            .slice(0, 10),
        });
      }

      // Mass activation anomaly
      const dormantToActive = curr.nodes.filter(n => {
        const prevNode = prev.nodes.find(pn => pn.id === n.id);
        return prevNode && prevNode.status === NodeStatus.DORMANT && n.status === NodeStatus.ACTIVE;
      });

      if (dormantToActive.length > prev.nodes.length * 0.1) {
        anomalies.push({
          timestamp: curr.timestamp,
          type: AnomalyType.MASS_ACTIVATION,
          severity: dormantToActive.length / prev.nodes.length,
          affectedMetrics: ['activity', 'nodeStatus'],
          possibleCauses: ['Sleeper network activation', 'Campaign launch'],
          relatedNodes: dormantToActive.map(n => n.id).slice(0, 10),
        });
      }
    }

    return anomalies;
  }

  /**
   * Build campaign timelines from patterns
   */
  private buildCampaignTimelines(patterns: EvolutionPattern[]): CampaignTimeline[] {
    const campaigns: CampaignTimeline[] = [];

    // Group patterns into potential campaigns
    const patternsByTime = patterns.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    let currentCampaign: EvolutionPattern[] = [];
    for (const pattern of patternsByTime) {
      if (currentCampaign.length === 0) {
        currentCampaign.push(pattern);
      } else {
        const lastPattern = currentCampaign[currentCampaign.length - 1];
        const timeDiff = pattern.startTime.getTime() - lastPattern.startTime.getTime();

        if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
          currentCampaign.push(pattern);
        } else {
          if (currentCampaign.length >= 2) {
            campaigns.push(this.buildCampaignFromPatterns(currentCampaign, campaigns.length));
          }
          currentCampaign = [pattern];
        }
      }
    }

    if (currentCampaign.length >= 2) {
      campaigns.push(this.buildCampaignFromPatterns(currentCampaign, campaigns.length));
    }

    return campaigns;
  }

  private buildCampaignFromPatterns(
    patterns: EvolutionPattern[],
    index: number
  ): CampaignTimeline {
    const phases: CampaignPhase[] = patterns.map((p, i) => ({
      name: `Phase ${i + 1}: ${p.type}`,
      startTime: p.startTime,
      endTime: p.endTime,
      characteristics: p.indicators,
      metrics: {
        activity: p.confidence,
        coordination: p.confidence * 0.9,
        reach: p.affectedNodes.length * 100,
        effectiveness: p.confidence * 0.8,
      },
    }));

    const trajectory: TrajectoryPoint[] = patterns.map(p => ({
      timestamp: p.startTime,
      influence: p.confidence * 100,
      reach: p.affectedNodes.length * 50,
      coordination: p.confidence,
    }));

    return {
      campaignId: `campaign_${index}`,
      phases,
      overallDuration: patterns[patterns.length - 1].startTime.getTime() - patterns[0].startTime.getTime(),
      currentPhase: phases[phases.length - 1].name,
      evolutionTrajectory: trajectory,
    };
  }
}

interface DetectionThresholds {
  growthAnomaly: number;
  coordinationThreshold: number;
  activationThreshold: number;
  narrativeShiftThreshold: number;
}
