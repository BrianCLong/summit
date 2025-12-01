/**
 * Collection Manager - Orchestrates multiple collectors
 * TRAINING/SIMULATION ONLY
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { SignalCollector, CollectorConfig, CollectorStatus } from './SignalCollector';
import {
  RawSignal,
  CollectionTask,
  SignalType,
  IntelligenceCategory,
  ClassificationLevel
} from '../types';

export interface CollectionManagerConfig {
  maxConcurrentTasks: number;
  signalRetentionHours: number;
  autoMinimization: boolean;
  complianceMode: 'TRAINING' | 'EXERCISE' | 'DEMONSTRATION';
}

export interface CollectionStats {
  totalSignals: number;
  signalsByType: Record<string, number>;
  signalsByCategory: Record<string, number>;
  activeCollectors: number;
  activeTasks: number;
}

export interface CollectionManagerEvents {
  'collector:added': (collector: SignalCollector) => void;
  'collector:removed': (collectorId: string) => void;
  'signal:collected': (signal: RawSignal) => void;
  'signal:processed': (signal: RawSignal) => void;
  'task:created': (task: CollectionTask) => void;
  'task:assigned': (task: CollectionTask, collectorId: string) => void;
  'compliance:violation': (message: string) => void;
  'error': (error: Error) => void;
}

export class CollectionManager extends EventEmitter<CollectionManagerEvents> {
  private config: CollectionManagerConfig;
  private collectors: Map<string, SignalCollector> = new Map();
  private tasks: Map<string, CollectionTask> = new Map();
  private signals: RawSignal[] = [];
  private complianceLog: Array<{
    timestamp: Date;
    action: string;
    taskId?: string;
    details: string;
  }> = [];

  constructor(config: Partial<CollectionManagerConfig> = {}) {
    super();
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 10,
      signalRetentionHours: config.signalRetentionHours || 72,
      autoMinimization: config.autoMinimization ?? true,
      complianceMode: config.complianceMode || 'TRAINING'
    };

    console.log(`[SIGINT] Collection Manager initialized in ${this.config.complianceMode} mode`);
  }

  async addCollector(config: CollectorConfig): Promise<SignalCollector> {
    const collector = new SignalCollector(config);

    collector.on('signal:received', (signal) => {
      this.handleSignal(signal);
    });

    collector.on('error', (error) => {
      this.emit('error', error);
    });

    await collector.initialize();
    this.collectors.set(config.id, collector);
    this.emit('collector:added', collector);

    this.logCompliance('COLLECTOR_ADDED', undefined, `Added collector: ${config.name}`);

    return collector;
  }

  async removeCollector(collectorId: string): Promise<void> {
    const collector = this.collectors.get(collectorId);
    if (collector) {
      await collector.shutdown();
      this.collectors.delete(collectorId);
      this.emit('collector:removed', collectorId);
      this.logCompliance('COLLECTOR_REMOVED', undefined, `Removed collector: ${collectorId}`);
    }
  }

  async createTask(params: {
    name: string;
    description?: string;
    targetFrequencies: Array<{ center: number; bandwidth: number; priority: number }>;
    targetSignalTypes?: SignalType[];
    targetLocations?: Array<{ latitude: number; longitude: number; radius: number }>;
    legalAuthority: string;
    durationHours: number;
    minimizationRequired?: boolean;
  }): Promise<CollectionTask> {
    // Validate legal authority
    if (!params.legalAuthority) {
      throw new Error('Legal authority is required for all collection tasks');
    }

    const now = new Date();
    const task: CollectionTask = {
      id: uuid(),
      name: params.name,
      description: params.description,
      targetFrequencies: params.targetFrequencies,
      targetSignalTypes: params.targetSignalTypes,
      targetLocations: params.targetLocations,
      startTime: now,
      endTime: new Date(now.getTime() + params.durationHours * 3600000),
      continuous: false,
      legalAuthority: params.legalAuthority,
      expirationDate: new Date(now.getTime() + params.durationHours * 3600000),
      minimizationRequired: params.minimizationRequired ?? true,
      status: 'PENDING',
      isTrainingTask: true
    };

    this.tasks.set(task.id, task);
    this.emit('task:created', task);
    this.logCompliance('TASK_CREATED', task.id, `Created task: ${task.name}, Authority: ${task.legalAuthority}`);

    return task;
  }

  async assignTask(taskId: string, collectorId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const collector = this.collectors.get(collectorId);

    if (!task) throw new Error(`Task ${taskId} not found`);
    if (!collector) throw new Error(`Collector ${collectorId} not found`);

    // Check task expiration
    if (task.expirationDate < new Date()) {
      throw new Error('Cannot assign expired task');
    }

    // Check concurrent task limit
    const activeTasks = Array.from(this.tasks.values()).filter(t => t.status === 'ACTIVE');
    if (activeTasks.length >= this.config.maxConcurrentTasks) {
      throw new Error(`Maximum concurrent tasks (${this.config.maxConcurrentTasks}) reached`);
    }

    task.status = 'ACTIVE';
    await collector.startCollection(task);
    this.emit('task:assigned', task, collectorId);
    this.logCompliance('TASK_ASSIGNED', taskId, `Assigned to collector: ${collectorId}`);
  }

  private handleSignal(signal: RawSignal): void {
    // Apply minimization if required
    if (this.config.autoMinimization) {
      this.applyMinimization(signal);
    }

    this.signals.push(signal);
    this.emit('signal:collected', signal);

    // Clean old signals
    this.cleanOldSignals();
  }

  private applyMinimization(signal: RawSignal): void {
    // Simulated minimization - in real systems this would redact US person information
    signal.metadata.minimized = true;

    // Log minimization action
    this.logCompliance(
      'MINIMIZATION_APPLIED',
      signal.metadata.missionId,
      `Signal ${signal.metadata.id} minimized`
    );
  }

  private cleanOldSignals(): void {
    const cutoff = new Date(Date.now() - this.config.signalRetentionHours * 3600000);
    this.signals = this.signals.filter(s => s.metadata.timestamp > cutoff);
  }

  private logCompliance(action: string, taskId: string | undefined, details: string): void {
    this.complianceLog.push({
      timestamp: new Date(),
      action,
      taskId,
      details
    });
  }

  getStats(): CollectionStats {
    const signalsByType: Record<string, number> = {};
    const signalsByCategory: Record<string, number> = {};

    for (const signal of this.signals) {
      const type = signal.metadata.signalType;
      const category = signal.metadata.category;
      signalsByType[type] = (signalsByType[type] || 0) + 1;
      signalsByCategory[category] = (signalsByCategory[category] || 0) + 1;
    }

    const activeCollectors = Array.from(this.collectors.values())
      .filter(c => c.getStatus() === 'COLLECTING').length;

    const activeTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'ACTIVE').length;

    return {
      totalSignals: this.signals.length,
      signalsByType,
      signalsByCategory,
      activeCollectors,
      activeTasks
    };
  }

  getCollectors(): SignalCollector[] {
    return Array.from(this.collectors.values());
  }

  getTasks(): CollectionTask[] {
    return Array.from(this.tasks.values());
  }

  getSignals(filter?: {
    signalType?: SignalType;
    category?: IntelligenceCategory;
    since?: Date;
  }): RawSignal[] {
    let result = [...this.signals];

    if (filter?.signalType) {
      result = result.filter(s => s.metadata.signalType === filter.signalType);
    }
    if (filter?.category) {
      result = result.filter(s => s.metadata.category === filter.category);
    }
    if (filter?.since) {
      result = result.filter(s => s.metadata.timestamp >= filter.since!);
    }

    return result;
  }

  getComplianceLog(): typeof this.complianceLog {
    return [...this.complianceLog];
  }

  async shutdown(): Promise<void> {
    for (const collector of this.collectors.values()) {
      await collector.shutdown();
    }
    this.collectors.clear();
    this.tasks.clear();
    this.logCompliance('SYSTEM_SHUTDOWN', undefined, 'Collection manager shut down');
    console.log('[SIGINT] Collection Manager shut down');
  }
}
