/**
 * Signal Collector - Base collection simulation
 * TRAINING/SIMULATION ONLY - No actual collection capabilities
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import {
  SignalMetadata,
  RawSignal,
  SignalType,
  IntelligenceCategory,
  ClassificationLevel,
  CollectionTask
} from '../types';

export interface CollectorConfig {
  id: string;
  name: string;
  type: 'SDR' | 'NETWORK' | 'SATELLITE' | 'TACTICAL' | 'STRATEGIC' | 'SIMULATION';
  capabilities: {
    frequencyRange?: { min: number; max: number };
    bandwidthMax?: number;
    signalTypes: SignalType[];
    categories: IntelligenceCategory[];
  };
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  classification: ClassificationLevel;
}

export interface CollectorEvents {
  'signal:received': (signal: RawSignal) => void;
  'signal:processed': (signal: RawSignal) => void;
  'task:started': (task: CollectionTask) => void;
  'task:completed': (task: CollectionTask) => void;
  'error': (error: Error) => void;
  'status:changed': (status: CollectorStatus) => void;
}

export type CollectorStatus = 'OFFLINE' | 'INITIALIZING' | 'READY' | 'COLLECTING' | 'PAUSED' | 'ERROR';

export class SignalCollector extends EventEmitter<CollectorEvents> {
  private config: CollectorConfig;
  private status: CollectorStatus = 'OFFLINE';
  private activeTasks: Map<string, CollectionTask> = new Map();
  private collectedSignals: RawSignal[] = [];
  private simulationInterval?: ReturnType<typeof setInterval>;

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.setStatus('INITIALIZING');

    // Simulate initialization delay
    await this.delay(500);

    console.log(`[SIGINT] Collector ${this.config.name} initialized (SIMULATION MODE)`);
    this.setStatus('READY');
  }

  async startCollection(task: CollectionTask): Promise<void> {
    if (this.status !== 'READY' && this.status !== 'COLLECTING') {
      throw new Error(`Collector not ready. Current status: ${this.status}`);
    }

    // Validate legal authority for training
    if (!task.legalAuthority) {
      throw new Error('Legal authority required for collection task');
    }

    if (task.expirationDate < new Date()) {
      throw new Error('Collection authority has expired');
    }

    this.activeTasks.set(task.id, task);
    this.setStatus('COLLECTING');
    this.emit('task:started', task);

    console.log(`[SIGINT] Started collection task: ${task.name} (SIMULATED)`);

    // Start simulated signal generation
    this.startSimulation(task);
  }

  async stopCollection(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'COMPLETED';
    this.activeTasks.delete(taskId);
    this.emit('task:completed', task);

    if (this.activeTasks.size === 0) {
      this.stopSimulation();
      this.setStatus('READY');
    }

    console.log(`[SIGINT] Stopped collection task: ${task.name}`);
  }

  private startSimulation(task: CollectionTask): void {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(() => {
      const signal = this.generateSimulatedSignal(task);
      this.collectedSignals.push(signal);
      this.emit('signal:received', signal);
    }, 1000 + Math.random() * 2000);
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
  }

  private generateSimulatedSignal(task: CollectionTask): RawSignal {
    const targetFreq = task.targetFrequencies[0];
    const freq = targetFreq
      ? targetFreq.center + (Math.random() - 0.5) * targetFreq.bandwidth
      : 100e6 + Math.random() * 5900e6;

    const signalType = task.targetSignalTypes?.[
      Math.floor(Math.random() * task.targetSignalTypes.length)
    ] || this.config.capabilities.signalTypes[
      Math.floor(Math.random() * this.config.capabilities.signalTypes.length)
    ];

    const metadata: SignalMetadata = {
      id: uuid(),
      timestamp: new Date(),
      signalType,
      category: this.inferCategory(signalType),
      classification: this.config.classification,
      frequency: freq,
      bandwidth: 10000 + Math.random() * 100000,
      signalStrength: -90 + Math.random() * 60,
      snr: 5 + Math.random() * 30,
      modulation: 'UNKNOWN',
      location: this.generateSimulatedLocation(task),
      collectorId: this.config.id,
      sensorId: `${this.config.id}-sensor-1`,
      missionId: task.id,
      processed: false,
      priority: task.targetFrequencies[0]?.priority || 3,
      legalAuthority: task.legalAuthority,
      minimized: false,
      isSimulated: true
    };

    // Generate simulated I/Q data
    const sampleCount = 1024;
    const i = new Float32Array(sampleCount);
    const q = new Float32Array(sampleCount);
    for (let n = 0; n < sampleCount; n++) {
      const t = n / sampleCount;
      i[n] = Math.cos(2 * Math.PI * 10 * t) + (Math.random() - 0.5) * 0.1;
      q[n] = Math.sin(2 * Math.PI * 10 * t) + (Math.random() - 0.5) * 0.1;
    }

    return {
      metadata,
      iqData: { i, q },
      decodedContent: '[SIMULATED SIGNAL DATA]'
    };
  }

  private generateSimulatedLocation(task: CollectionTask): SignalMetadata['location'] | undefined {
    const targetLoc = task.targetLocations?.[0];
    if (targetLoc) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * targetLoc.radius;
      return {
        latitude: targetLoc.latitude + (distance / 111) * Math.cos(angle),
        longitude: targetLoc.longitude + (distance / 111) * Math.sin(angle),
        accuracy: 100 + Math.random() * 500,
        method: 'SIMULATED'
      };
    }
    return undefined;
  }

  private inferCategory(signalType: SignalType): IntelligenceCategory {
    const comintTypes: SignalType[] = [
      'CELLULAR_2G', 'CELLULAR_3G', 'CELLULAR_4G', 'CELLULAR_5G',
      'WIFI', 'BLUETOOTH', 'SATELLITE', 'SHORTWAVE', 'VHF', 'UHF'
    ];
    const elintTypes: SignalType[] = ['RADAR', 'NAVIGATION', 'TELEMETRY'];

    if (comintTypes.includes(signalType)) return 'COMINT';
    if (elintTypes.includes(signalType)) return 'ELINT';
    return 'TECHINT';
  }

  private setStatus(status: CollectorStatus): void {
    this.status = status;
    this.emit('status:changed', status);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): CollectorStatus {
    return this.status;
  }

  getConfig(): CollectorConfig {
    return { ...this.config };
  }

  getActiveTasks(): CollectionTask[] {
    return Array.from(this.activeTasks.values());
  }

  getCollectedSignals(): RawSignal[] {
    return [...this.collectedSignals];
  }

  async shutdown(): Promise<void> {
    this.stopSimulation();
    for (const taskId of this.activeTasks.keys()) {
      await this.stopCollection(taskId);
    }
    this.setStatus('OFFLINE');
    console.log(`[SIGINT] Collector ${this.config.name} shut down`);
  }
}
