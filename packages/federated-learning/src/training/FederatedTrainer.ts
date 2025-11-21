import EventEmitter from 'eventemitter3';
import { pino, type Logger } from 'pino';

export interface TrainingRound {
  roundNumber: number;
  participatingNodes: string[];
  globalModel: unknown;
  startTime: Date;
  endTime?: Date;
  metrics: {
    avgLoss?: number;
    avgAccuracy?: number;
    convergence?: number;
  };
}

export interface LocalUpdate {
  nodeId: string;
  roundNumber: number;
  modelUpdate: unknown;
  numSamples: number;
  metrics: {
    loss: number;
    accuracy: number;
    trainingTime: number;
  };
  timestamp: Date;
}

export interface FederatedConfig {
  minParticipants: number;
  maxRounds: number;
  targetAccuracy?: number;
  aggregationStrategy: 'fedavg' | 'fedprox' | 'fedadam' | 'weighted-average';
  clientSelection: 'random' | 'resource-aware' | 'performance-based';
  roundTimeout: number; // seconds
  differentialPrivacy?: {
    enabled: boolean;
    epsilon: number;
    delta: number;
    clipNorm?: number;
  };
}

/**
 * Federated Trainer
 * Coordinates distributed model training across edge nodes
 */
export class FederatedTrainer extends EventEmitter {
  private logger: Logger;
  private config: FederatedConfig;
  private currentRound: TrainingRound | null = null;
  private rounds: TrainingRound[] = [];
  private pendingUpdates: Map<number, LocalUpdate[]> = new Map();
  private globalModel: unknown | null = null;

  constructor(config: FederatedConfig, logger?: Logger) {
    super();
    this.config = config;
    this.logger = logger || pino({ name: 'FederatedTrainer' });
  }

  /**
   * Initialize federated learning with global model
   */
  async initialize(initialModel: unknown): Promise<void> {
    this.globalModel = initialModel;
    this.logger.info('Federated trainer initialized');
    this.emit('initialized', { model: initialModel });
  }

  /**
   * Start a new training round
   */
  async startRound(availableNodes: string[]): Promise<TrainingRound> {
    if (this.currentRound && !this.currentRound.endTime) {
      throw new Error('Previous round still in progress');
    }

    // Select participants based on strategy
    const participants = this.selectParticipants(availableNodes);

    if (participants.length < this.config.minParticipants) {
      throw new Error(
        `Insufficient participants: ${participants.length} < ${this.config.minParticipants}`
      );
    }

    const roundNumber = this.rounds.length + 1;

    this.currentRound = {
      roundNumber,
      participatingNodes: participants,
      globalModel: this.globalModel,
      startTime: new Date(),
      metrics: {}
    };

    this.pendingUpdates.set(roundNumber, []);

    this.logger.info(
      { roundNumber, participants: participants.length },
      'Started federated training round'
    );

    this.emit('round-started', this.currentRound);

    // Set timeout for round
    setTimeout(() => {
      if (this.currentRound?.roundNumber === roundNumber && !this.currentRound.endTime) {
        this.completeRound(roundNumber);
      }
    }, this.config.roundTimeout * 1000);

    return this.currentRound;
  }

  /**
   * Submit local update from edge node
   */
  async submitUpdate(update: LocalUpdate): Promise<void> {
    if (!this.currentRound || this.currentRound.roundNumber !== update.roundNumber) {
      throw new Error('No active round or round number mismatch');
    }

    if (!this.currentRound.participatingNodes.includes(update.nodeId)) {
      throw new Error('Node not participating in this round');
    }

    const updates = this.pendingUpdates.get(update.roundNumber) || [];
    updates.push(update);
    this.pendingUpdates.set(update.roundNumber, updates);

    this.logger.info(
      {
        roundNumber: update.roundNumber,
        nodeId: update.nodeId,
        received: updates.length,
        total: this.currentRound.participatingNodes.length
      },
      'Received local update'
    );

    this.emit('update-received', { update, progress: updates.length / this.currentRound.participatingNodes.length });

    // Check if all updates received
    if (updates.length === this.currentRound.participatingNodes.length) {
      await this.completeRound(update.roundNumber);
    }
  }

  /**
   * Complete training round and aggregate updates
   */
  private async completeRound(roundNumber: number): Promise<void> {
    if (!this.currentRound || this.currentRound.roundNumber !== roundNumber) {
      return;
    }

    const updates = this.pendingUpdates.get(roundNumber) || [];

    if (updates.length === 0) {
      this.logger.warn({ roundNumber }, 'No updates received for round');
      this.currentRound.endTime = new Date();
      this.rounds.push(this.currentRound);
      this.emit('round-failed', { roundNumber, reason: 'no-updates' });
      this.currentRound = null;
      return;
    }

    this.logger.info(
      { roundNumber, updates: updates.length },
      'Aggregating model updates'
    );

    try {
      // Aggregate updates
      const aggregatedModel = await this.aggregateUpdates(updates);

      // Calculate metrics
      const avgLoss = updates.reduce((sum, u) => sum + u.metrics.loss, 0) / updates.length;
      const avgAccuracy = updates.reduce((sum, u) => sum + u.metrics.accuracy, 0) / updates.length;

      this.currentRound.metrics = {
        avgLoss,
        avgAccuracy,
        convergence: this.calculateConvergence(avgLoss)
      };

      this.currentRound.endTime = new Date();
      this.globalModel = aggregatedModel;

      this.rounds.push(this.currentRound);

      this.logger.info(
        {
          roundNumber,
          avgLoss: avgLoss.toFixed(4),
          avgAccuracy: avgAccuracy.toFixed(4)
        },
        'Round completed'
      );

      this.emit('round-completed', {
        round: this.currentRound,
        globalModel: aggregatedModel
      });

      this.currentRound = null;

      // Check if training should continue
      if (this.shouldContinueTraining()) {
        this.emit('continue-training');
      } else {
        this.emit('training-completed', {
          totalRounds: this.rounds.length,
          finalModel: this.globalModel,
          finalMetrics: this.rounds[this.rounds.length - 1].metrics
        });
      }
    } catch (error) {
      this.logger.error({ error, roundNumber }, 'Failed to complete round');
      this.emit('round-failed', { roundNumber, error });
    }
  }

  /**
   * Aggregate model updates from participants
   */
  private async aggregateUpdates(updates: LocalUpdate[]): Promise<unknown> {
    switch (this.config.aggregationStrategy) {
      case 'fedavg':
        return this.federatedAveraging(updates);
      case 'weighted-average':
        return this.weightedAveraging(updates);
      case 'fedprox':
        return this.federatedProx(updates);
      case 'fedadam':
        return this.federatedAdam(updates);
      default:
        return this.federatedAveraging(updates);
    }
  }

  /**
   * Federated Averaging (FedAvg)
   */
  private async federatedAveraging(updates: LocalUpdate[]): Promise<unknown> {
    this.logger.debug('Applying FedAvg aggregation');

    const totalSamples = updates.reduce((sum, u) => sum + u.numSamples, 0);

    // Weighted average based on number of samples
    // In real implementation, this would average the actual model weights
    return {
      type: 'fedavg',
      weights: 'aggregated_weights_placeholder',
      totalSamples,
      numClients: updates.length
    };
  }

  /**
   * Weighted Averaging
   */
  private async weightedAveraging(updates: LocalUpdate[]): Promise<unknown> {
    this.logger.debug('Applying weighted averaging');

    const totalSamples = updates.reduce((sum, u) => sum + u.numSamples, 0);

    return {
      type: 'weighted-average',
      weights: 'aggregated_weights_placeholder',
      totalSamples
    };
  }

  /**
   * FedProx - handles heterogeneous data/devices
   */
  private async federatedProx(updates: LocalUpdate[]): Promise<unknown> {
    this.logger.debug('Applying FedProx aggregation');

    return {
      type: 'fedprox',
      weights: 'aggregated_weights_placeholder',
      proximalTerm: 0.01
    };
  }

  /**
   * FedAdam - adaptive optimization for federated learning
   */
  private async federatedAdam(updates: LocalUpdate[]): Promise<unknown> {
    this.logger.debug('Applying FedAdam aggregation');

    return {
      type: 'fedadam',
      weights: 'aggregated_weights_placeholder',
      momentum: 0.9,
      beta: 0.999
    };
  }

  /**
   * Select participants for training round
   */
  private selectParticipants(availableNodes: string[]): string[] {
    const numParticipants = Math.min(
      availableNodes.length,
      Math.max(this.config.minParticipants, Math.floor(availableNodes.length * 0.5))
    );

    switch (this.config.clientSelection) {
      case 'random':
        return this.randomSelection(availableNodes, numParticipants);
      case 'resource-aware':
        return this.resourceAwareSelection(availableNodes, numParticipants);
      case 'performance-based':
        return this.performanceBasedSelection(availableNodes, numParticipants);
      default:
        return this.randomSelection(availableNodes, numParticipants);
    }
  }

  /**
   * Random client selection
   */
  private randomSelection(nodes: string[], count: number): string[] {
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Resource-aware client selection
   */
  private resourceAwareSelection(nodes: string[], count: number): string[] {
    // In real implementation, this would consider node resources
    return this.randomSelection(nodes, count);
  }

  /**
   * Performance-based client selection
   */
  private performanceBasedSelection(nodes: string[], count: number): string[] {
    // In real implementation, this would prioritize high-performing nodes
    return this.randomSelection(nodes, count);
  }

  /**
   * Calculate convergence metric
   */
  private calculateConvergence(currentLoss: number): number {
    if (this.rounds.length === 0) return 0;

    const previousLoss = this.rounds[this.rounds.length - 1].metrics.avgLoss || currentLoss;
    const improvement = (previousLoss - currentLoss) / previousLoss;

    return Math.max(0, Math.min(1, improvement * 10)); // Normalize to 0-1
  }

  /**
   * Check if training should continue
   */
  private shouldContinueTraining(): boolean {
    if (this.rounds.length >= this.config.maxRounds) {
      return false;
    }

    const lastRound = this.rounds[this.rounds.length - 1];

    if (this.config.targetAccuracy && lastRound.metrics.avgAccuracy) {
      return lastRound.metrics.avgAccuracy < this.config.targetAccuracy;
    }

    // Check convergence
    if (lastRound.metrics.convergence !== undefined && lastRound.metrics.convergence < 0.001) {
      return false;
    }

    return true;
  }

  /**
   * Get current global model
   */
  getGlobalModel(): unknown | null {
    return this.globalModel;
  }

  /**
   * Get training history
   */
  getTrainingHistory(): TrainingRound[] {
    return this.rounds;
  }

  /**
   * Get current round status
   */
  getCurrentRound(): TrainingRound | null {
    return this.currentRound;
  }

  /**
   * Get training statistics
   */
  getStats(): {
    totalRounds: number;
    completedRounds: number;
    avgParticipants: number;
    bestAccuracy: number;
    currentAccuracy: number;
  } {
    const completedRounds = this.rounds.filter(r => r.endTime).length;
    const avgParticipants = this.rounds.length > 0
      ? this.rounds.reduce((sum, r) => sum + r.participatingNodes.length, 0) / this.rounds.length
      : 0;

    const accuracies = this.rounds
      .map(r => r.metrics.avgAccuracy)
      .filter((a): a is number => a !== undefined);

    const bestAccuracy = accuracies.length > 0 ? Math.max(...accuracies) : 0;
    const currentAccuracy = accuracies.length > 0 ? accuracies[accuracies.length - 1] : 0;

    return {
      totalRounds: this.rounds.length,
      completedRounds,
      avgParticipants,
      bestAccuracy,
      currentAccuracy
    };
  }

  /**
   * Reset trainer
   */
  async reset(): Promise<void> {
    this.currentRound = null;
    this.rounds = [];
    this.pendingUpdates.clear();
    this.globalModel = null;

    this.logger.info('Federated trainer reset');
    this.emit('reset');
  }
}
