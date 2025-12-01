/**
 * Data Source Adapter - Interface for authorized data sources
 *
 * NOTICE: This adapter is designed ONLY for:
 * - Simulated/synthetic data feeds
 * - Authorized training data repositories
 * - Your own network infrastructure (defensive monitoring)
 * - Properly authorized and legally obtained data
 *
 * This does NOT enable unauthorized interception.
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { RawSignal, SignalMetadata, SignalType, ClassificationLevel } from '../types';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  connectionString?: string;
  authorization: AuthorizationInfo;
  options?: Record<string, unknown>;
}

export type DataSourceType =
  | 'SIMULATION'      // Internal simulation generator
  | 'FILE'            // Pre-recorded/authorized files
  | 'TRAINING_FEED'   // Authorized training data feed
  | 'DEFENSIVE'       // Your own infrastructure monitoring
  | 'EXERCISE'        // Sanctioned exercise data
  | 'REPLAY';         // Replay of authorized recordings

export interface AuthorizationInfo {
  authority: string;
  reference: string;
  validFrom: Date;
  validTo: Date;
  restrictions: string[];
  authorizedBy: string;
  verificationMethod: 'MANUAL' | 'TOKEN' | 'CERTIFICATE';
}

export interface DataSourceEvents {
  'data:received': (data: RawSignal) => void;
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'authorization:expired': () => void;
}

export abstract class DataSourceAdapter extends EventEmitter<DataSourceEvents> {
  protected config: DataSourceConfig;
  protected connected: boolean = false;
  protected authorizationValid: boolean = false;

  constructor(config: DataSourceConfig) {
    super();
    this.config = config;
    this.validateAuthorization();
  }

  /**
   * Validate authorization before any data access
   */
  protected validateAuthorization(): boolean {
    const auth = this.config.authorization;
    const now = new Date();

    if (now < auth.validFrom || now > auth.validTo) {
      this.authorizationValid = false;
      this.emit('authorization:expired');
      return false;
    }

    // Check source type is authorized
    const allowedTypes: DataSourceType[] = [
      'SIMULATION', 'FILE', 'TRAINING_FEED', 'DEFENSIVE', 'EXERCISE', 'REPLAY'
    ];

    if (!allowedTypes.includes(this.config.type)) {
      throw new Error(`Unauthorized data source type: ${this.config.type}`);
    }

    this.authorizationValid = true;
    return true;
  }

  /**
   * Connect to data source
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from data source
   */
  abstract disconnect(): Promise<void>;

  /**
   * Start receiving data
   */
  abstract startReceiving(): Promise<void>;

  /**
   * Stop receiving data
   */
  abstract stopReceiving(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.authorizationValid;
  }

  /**
   * Get configuration
   */
  getConfig(): DataSourceConfig {
    return { ...this.config };
  }
}

/**
 * File-based data source for pre-recorded authorized data
 */
export class FileDataSource extends DataSourceAdapter {
  private filePath?: string;
  private fileReader?: NodeJS.Timeout;

  constructor(config: DataSourceConfig & { filePath: string }) {
    super(config);
    this.filePath = config.filePath;
  }

  async connect(): Promise<void> {
    if (!this.validateAuthorization()) {
      throw new Error('Authorization invalid or expired');
    }

    // Verify file exists and is authorized
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    await this.stopReceiving();
    this.connected = false;
    this.emit('disconnected');
  }

  async startReceiving(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    // Simulate reading from file
    this.fileReader = setInterval(() => {
      const signal = this.generateFromFile();
      this.emit('data:received', signal);
    }, 1000);
  }

  async stopReceiving(): Promise<void> {
    if (this.fileReader) {
      clearInterval(this.fileReader);
      this.fileReader = undefined;
    }
  }

  private generateFromFile(): RawSignal {
    // Simulates reading pre-recorded data
    const metadata: SignalMetadata = {
      id: uuid(),
      timestamp: new Date(),
      signalType: 'RF_DIGITAL',
      category: 'TECHINT',
      classification: 'UNCLASSIFIED',
      collectorId: this.config.id,
      processed: false,
      priority: 3,
      legalAuthority: this.config.authorization.reference,
      isSimulated: true
    };

    return { metadata };
  }
}

/**
 * Training feed data source for real-time training data
 */
export class TrainingFeedSource extends DataSourceAdapter {
  private feedInterval?: NodeJS.Timeout;
  private signalTypes: SignalType[];
  private rate: number;

  constructor(config: DataSourceConfig & {
    signalTypes?: SignalType[];
    rate?: number;
  }) {
    super(config);
    this.signalTypes = config.signalTypes || ['RF_DIGITAL', 'CELLULAR_4G', 'WIFI'];
    this.rate = config.rate || 1000;
  }

  async connect(): Promise<void> {
    if (!this.validateAuthorization()) {
      throw new Error('Authorization invalid or expired');
    }

    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    await this.stopReceiving();
    this.connected = false;
    this.emit('disconnected');
  }

  async startReceiving(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    this.feedInterval = setInterval(() => {
      const signal = this.generateTrainingSignal();
      this.emit('data:received', signal);
    }, this.rate);
  }

  async stopReceiving(): Promise<void> {
    if (this.feedInterval) {
      clearInterval(this.feedInterval);
      this.feedInterval = undefined;
    }
  }

  private generateTrainingSignal(): RawSignal {
    const signalType = this.signalTypes[
      Math.floor(Math.random() * this.signalTypes.length)
    ];

    const metadata: SignalMetadata = {
      id: uuid(),
      timestamp: new Date(),
      signalType,
      category: 'COMINT',
      classification: 'UNCLASSIFIED',
      frequency: 100e6 + Math.random() * 5000e6,
      bandwidth: 1e6 + Math.random() * 50e6,
      signalStrength: -90 + Math.random() * 60,
      snr: 5 + Math.random() * 30,
      collectorId: this.config.id,
      processed: false,
      priority: Math.ceil(Math.random() * 5),
      legalAuthority: this.config.authorization.reference,
      isSimulated: true
    };

    // Generate I/Q data
    const sampleCount = 1024;
    const i = new Float32Array(sampleCount);
    const q = new Float32Array(sampleCount);

    for (let n = 0; n < sampleCount; n++) {
      const t = n / sampleCount;
      i[n] = Math.cos(2 * Math.PI * 10 * t) + (Math.random() - 0.5) * 0.2;
      q[n] = Math.sin(2 * Math.PI * 10 * t) + (Math.random() - 0.5) * 0.2;
    }

    return {
      metadata,
      iqData: { i, q },
      decodedContent: '[TRAINING DATA]'
    };
  }
}

/**
 * Exercise data source for sanctioned exercises
 */
export class ExerciseDataSource extends DataSourceAdapter {
  private exerciseId: string;
  private scenarioData: RawSignal[] = [];
  private playbackIndex: number = 0;
  private playbackInterval?: NodeJS.Timeout;

  constructor(config: DataSourceConfig & { exerciseId: string }) {
    super(config);
    this.exerciseId = config.exerciseId;
  }

  async connect(): Promise<void> {
    if (!this.validateAuthorization()) {
      throw new Error('Authorization invalid or expired');
    }

    // Load exercise scenario
    this.loadExerciseScenario();
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    await this.stopReceiving();
    this.connected = false;
    this.emit('disconnected');
  }

  async startReceiving(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    this.playbackIndex = 0;
    this.playbackInterval = setInterval(() => {
      if (this.playbackIndex < this.scenarioData.length) {
        this.emit('data:received', this.scenarioData[this.playbackIndex]);
        this.playbackIndex++;
      } else {
        // Loop or stop
        this.playbackIndex = 0;
      }
    }, 500);
  }

  async stopReceiving(): Promise<void> {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = undefined;
    }
  }

  private loadExerciseScenario(): void {
    // Generate exercise scenario data
    const signalTypes: SignalType[] = [
      'CELLULAR_4G', 'WIFI', 'RADAR', 'SATELLITE', 'VHF'
    ];

    for (let i = 0; i < 100; i++) {
      const metadata: SignalMetadata = {
        id: uuid(),
        timestamp: new Date(Date.now() + i * 1000),
        signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
        category: Math.random() > 0.7 ? 'ELINT' : 'COMINT',
        classification: 'UNCLASSIFIED',
        frequency: 100e6 + Math.random() * 10000e6,
        bandwidth: 100e3 + Math.random() * 10e6,
        signalStrength: -100 + Math.random() * 70,
        location: {
          latitude: 38.8 + Math.random() * 0.2,
          longitude: -77.1 + Math.random() * 0.2,
          accuracy: 50 + Math.random() * 500,
          method: 'SIMULATED'
        },
        collectorId: this.config.id,
        missionId: this.exerciseId,
        processed: false,
        priority: Math.ceil(Math.random() * 5),
        legalAuthority: this.config.authorization.reference,
        isSimulated: true
      };

      this.scenarioData.push({ metadata });
    }
  }

  getExerciseId(): string {
    return this.exerciseId;
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.playbackIndex,
      total: this.scenarioData.length
    };
  }
}

/**
 * Factory for creating data source adapters
 */
export class DataSourceFactory {
  static create(config: DataSourceConfig): DataSourceAdapter {
    switch (config.type) {
      case 'FILE':
        return new FileDataSource(config as DataSourceConfig & { filePath: string });
      case 'TRAINING_FEED':
      case 'SIMULATION':
        return new TrainingFeedSource(config);
      case 'EXERCISE':
        return new ExerciseDataSource(config as DataSourceConfig & { exerciseId: string });
      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }
  }

  static createTrainingSource(name: string): DataSourceAdapter {
    return new TrainingFeedSource({
      id: uuid(),
      name,
      type: 'TRAINING_FEED',
      authorization: {
        authority: 'TRAINING',
        reference: 'TRAINING-AUTO',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        restrictions: ['SIMULATION_ONLY'],
        authorizedBy: 'SYSTEM',
        verificationMethod: 'MANUAL'
      }
    });
  }
}
