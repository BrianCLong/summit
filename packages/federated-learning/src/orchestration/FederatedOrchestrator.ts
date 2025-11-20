/**
 * Federated Learning Orchestration Engine
 * Coordinates distributed model training across clients
 */

import { EventEmitter } from 'events';
import {
  FederatedConfig,
  FederatedSession,
  FederatedRound,
  ClientUpdate,
  ClientConfig,
  AggregationResult,
  ModelWeights,
} from '../types.js';
import { FedAvgAggregator } from '../aggregation/FedAvgAggregator.js';
import { ClientSelector } from './ClientSelector.js';
import { v4 as uuidv4 } from 'uuid';

export class FederatedOrchestrator extends EventEmitter {
  private sessions: Map<string, FederatedSession> = new Map();
  private aggregator: FedAvgAggregator;
  private clientSelector: ClientSelector;

  constructor() {
    super();
    this.aggregator = new FedAvgAggregator();
    this.clientSelector = new ClientSelector();
  }

  /**
   * Initialize a new federated learning session
   */
  async initializeSession(
    config: FederatedConfig,
    clients: ClientConfig[],
    initialWeights: ModelWeights
  ): Promise<string> {
    const sessionId = uuidv4();

    const session: FederatedSession = {
      sessionId,
      config,
      currentRound: 0,
      rounds: [],
      clients,
      status: 'initialized',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize first round
    const selectedClients = this.clientSelector.selectClients(
      clients,
      config.minClientsPerRound,
      config.maxClientsPerRound,
      config.clientFraction
    );

    const initialRound: FederatedRound = {
      roundNumber: 0,
      selectedClients: selectedClients.map((c) => c.clientId),
      globalWeights: initialWeights,
      metrics: {
        totalClients: clients.length,
        participatingClients: selectedClients.length,
        averageLoss: 0,
        aggregationTime: 0,
        communicationCost: 0,
      },
      startTime: new Date(),
      status: 'pending',
    };

    session.rounds.push(initialRound);
    this.sessions.set(sessionId, session);

    this.emit('session:initialized', { sessionId, config });

    return sessionId;
  }

  /**
   * Start a federated learning round
   */
  async startRound(sessionId: string): Promise<FederatedRound> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'running';
    session.currentRound++;

    const selectedClients = this.clientSelector.selectClients(
      session.clients,
      session.config.minClientsPerRound,
      session.config.maxClientsPerRound,
      session.config.clientFraction
    );

    const previousRound = session.rounds[session.rounds.length - 1];
    const globalWeights = previousRound.aggregatedWeights || previousRound.globalWeights;

    const round: FederatedRound = {
      roundNumber: session.currentRound,
      selectedClients: selectedClients.map((c) => c.clientId),
      globalWeights,
      metrics: {
        totalClients: session.clients.length,
        participatingClients: selectedClients.length,
        averageLoss: 0,
        aggregationTime: 0,
        communicationCost: 0,
      },
      startTime: new Date(),
      status: 'in_progress',
    };

    session.rounds.push(round);
    session.updatedAt = new Date();

    this.emit('round:started', { sessionId, round });

    return round;
  }

  /**
   * Submit client update for aggregation
   */
  async submitClientUpdate(sessionId: string, update: ClientUpdate): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const currentRound = session.rounds[session.rounds.length - 1];
    if (currentRound.roundNumber !== update.roundNumber) {
      throw new Error(
        `Update round ${update.roundNumber} does not match current round ${currentRound.roundNumber}`
      );
    }

    if (!currentRound.selectedClients.includes(update.clientId)) {
      throw new Error(`Client ${update.clientId} not selected for round ${update.roundNumber}`);
    }

    this.emit('update:received', { sessionId, update });
  }

  /**
   * Aggregate client updates and complete round
   */
  async aggregateRound(sessionId: string, updates: ClientUpdate[]): Promise<AggregationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const currentRound = session.rounds[session.rounds.length - 1];
    const startTime = Date.now();

    // Perform aggregation based on strategy
    const result = await this.aggregator.aggregate(updates, session.config);

    const aggregationTime = Date.now() - startTime;

    // Update round with aggregated results
    currentRound.aggregatedWeights = result.aggregatedWeights;
    currentRound.metrics = {
      ...result.metrics,
      aggregationTime,
    };
    currentRound.endTime = new Date();
    currentRound.status = 'completed';

    session.updatedAt = new Date();

    this.emit('round:completed', { sessionId, round: currentRound, result });

    // Check for convergence
    if (this.hasConverged(session)) {
      session.status = 'completed';
      this.emit('session:completed', { sessionId, session });
    }

    return result;
  }

  /**
   * Get current global model weights
   */
  getGlobalWeights(sessionId: string): ModelWeights {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const currentRound = session.rounds[session.rounds.length - 1];
    return currentRound.aggregatedWeights || currentRound.globalWeights;
  }

  /**
   * Get session status and metrics
   */
  getSessionStatus(sessionId: string): FederatedSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Pause a federated learning session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'paused';
    session.updatedAt = new Date();

    this.emit('session:paused', { sessionId });
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Session ${sessionId} is not paused`);
    }

    session.status = 'running';
    session.updatedAt = new Date();

    this.emit('session:resumed', { sessionId });
  }

  /**
   * Check if model has converged
   */
  private hasConverged(session: FederatedSession): boolean {
    if (!session.config.convergenceThreshold) {
      // Check if we've completed all rounds
      return session.currentRound >= session.config.numRounds;
    }

    // Check loss improvement
    const rounds = session.rounds;
    if (rounds.length < 3) return false;

    const recentRounds = rounds.slice(-3);
    const lossImprovement =
      recentRounds[0].metrics.averageLoss - recentRounds[2].metrics.averageLoss;

    return Math.abs(lossImprovement) < session.config.convergenceThreshold;
  }

  /**
   * Get training metrics across all rounds
   */
  getTrainingMetrics(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      totalRounds: session.rounds.length,
      currentRound: session.currentRound,
      status: session.status,
      rounds: session.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        metrics: r.metrics,
        duration: r.endTime
          ? r.endTime.getTime() - r.startTime.getTime()
          : Date.now() - r.startTime.getTime(),
      })),
    };
  }
}
