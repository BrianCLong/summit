/**
 * SIGINT Engine - Core processing orchestrator
 * TRAINING/SIMULATION ONLY
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { CollectionManager } from '@summit/sigint-collector';
import { SignalGenerator } from '@summit/sigint-collector';
import { SpectrumMonitor } from '@summit/sigint-collector';
import { ModulationClassifier } from '@summit/rf-processor';
import { SpectralAnalyzer } from '@summit/rf-processor';
import { VoiceAnalyzer } from '@summit/comint-analyzer';
import { MessageAnalyzer } from '@summit/comint-analyzer';
import { CommunicationsMapper } from '@summit/comint-analyzer';
import { PacketAnalyzer } from '@summit/network-interceptor';
import { FlowAnalyzer } from '@summit/network-interceptor';
import { CryptoAnalyzer } from '@summit/cryptanalysis-engine';
import { TrafficPatternAnalyzer } from '@summit/cryptanalysis-engine';
import { TDOALocator } from '@summit/geolocation-engine';
import { TrackManager } from '@summit/geolocation-engine';
import { ComplianceManager } from '../compliance/ComplianceManager';

export interface ProcessingTask {
  id: string;
  type: 'COMINT' | 'ELINT' | 'NETWORK' | 'GEOLOCATION';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export interface EngineStatus {
  mode: 'TRAINING' | 'EXERCISE' | 'DEMONSTRATION';
  status: 'running' | 'paused' | 'stopped';
  uptime: number;
  tasksProcessed: number;
  activeCollectors: number;
  activeTracks: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
}

export class SIGINTEngine extends EventEmitter {
  private complianceManager: ComplianceManager;

  // Collection
  private collectionManager: CollectionManager;
  private signalGenerator: SignalGenerator;
  private spectrumMonitor: SpectrumMonitor;

  // RF Processing
  private modulationClassifier: ModulationClassifier;
  private spectralAnalyzer: SpectralAnalyzer;

  // COMINT
  private voiceAnalyzer: VoiceAnalyzer;
  private messageAnalyzer: MessageAnalyzer;
  private communicationsMapper: CommunicationsMapper;

  // Network
  private packetAnalyzer: PacketAnalyzer;
  private flowAnalyzer: FlowAnalyzer;

  // Crypto
  private cryptoAnalyzer: CryptoAnalyzer;
  private trafficPatternAnalyzer: TrafficPatternAnalyzer;

  // Geolocation
  private tdoaLocator: TDOALocator;
  private trackManager: TrackManager;

  // State
  private status: EngineStatus['status'] = 'stopped';
  private startTime?: Date;
  private tasksProcessed: number = 0;
  private taskQueue: ProcessingTask[] = [];

  constructor(complianceManager: ComplianceManager) {
    super();
    this.complianceManager = complianceManager;

    // Initialize all components
    this.collectionManager = new CollectionManager({ complianceMode: 'TRAINING' });
    this.signalGenerator = new SignalGenerator({ realism: 'HIGH', includeNoise: true });
    this.spectrumMonitor = new SpectrumMonitor({
      startFrequency: 30e6,
      endFrequency: 6e9,
      resolution: 100e3,
      sweepRate: 1,
      sensitivity: -80
    });

    this.modulationClassifier = new ModulationClassifier();
    this.spectralAnalyzer = new SpectralAnalyzer({ sampleRate: 1e6 });

    this.voiceAnalyzer = new VoiceAnalyzer();
    this.messageAnalyzer = new MessageAnalyzer();
    this.communicationsMapper = new CommunicationsMapper();

    this.packetAnalyzer = new PacketAnalyzer();
    this.flowAnalyzer = new FlowAnalyzer();

    this.cryptoAnalyzer = new CryptoAnalyzer();
    this.trafficPatternAnalyzer = new TrafficPatternAnalyzer();

    this.tdoaLocator = new TDOALocator();
    this.trackManager = new TrackManager();

    this.setupEventHandlers();
    this.complianceManager.log('ENGINE_INIT', 'SIGINT Engine initialized in TRAINING mode');
  }

  private setupEventHandlers(): void {
    this.collectionManager.on('signal:collected', (signal) => {
      this.emit('signal:collected', signal);
      this.complianceManager.log('SIGNAL_COLLECTED', `Signal ${signal.metadata.id} collected`);
    });

    this.spectrumMonitor.on('signal:detected', (signal) => {
      this.emit('spectrum:signal', signal);
    });

    this.spectrumMonitor.on('anomaly:detected', (anomaly) => {
      this.emit('spectrum:anomaly', anomaly);
      this.complianceManager.log('ANOMALY_DETECTED', `Anomaly at ${anomaly.frequency}Hz`);
    });
  }

  async start(): Promise<void> {
    if (this.status === 'running') return;

    this.status = 'running';
    this.startTime = new Date();
    this.spectrumMonitor.start();

    this.complianceManager.log('ENGINE_START', 'SIGINT Engine started');
    this.emit('status:changed', this.getStatus());

    // Start task processor
    this.processTaskQueue();
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
    this.spectrumMonitor.stop();
    await this.collectionManager.shutdown();

    this.complianceManager.log('ENGINE_STOP', 'SIGINT Engine stopped');
    this.emit('status:changed', this.getStatus());
  }

  pause(): void {
    this.status = 'paused';
    this.spectrumMonitor.stop();
    this.emit('status:changed', this.getStatus());
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.spectrumMonitor.start();
      this.emit('status:changed', this.getStatus());
    }
  }

  /**
   * Submit a processing task
   */
  submitTask(type: ProcessingTask['type'], data: unknown, priority: number = 3): string {
    const task: ProcessingTask = {
      id: uuid(),
      type,
      status: 'pending',
      priority,
      createdAt: new Date()
    };

    // Insert by priority
    const insertIdx = this.taskQueue.findIndex(t => t.priority > priority);
    if (insertIdx === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIdx, 0, task);
    }

    this.complianceManager.log('TASK_SUBMITTED', `Task ${task.id} of type ${type} submitted`);
    return task.id;
  }

  private async processTaskQueue(): Promise<void> {
    while (this.status === 'running') {
      if (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        await this.processTask(task);
      }
      await this.delay(100);
    }
  }

  private async processTask(task: ProcessingTask): Promise<void> {
    task.status = 'processing';
    task.startedAt = new Date();

    try {
      switch (task.type) {
        case 'COMINT':
          task.result = await this.processCOMINT(task);
          break;
        case 'ELINT':
          task.result = await this.processELINT(task);
          break;
        case 'NETWORK':
          task.result = await this.processNetwork(task);
          break;
        case 'GEOLOCATION':
          task.result = await this.processGeolocation(task);
          break;
      }

      task.status = 'completed';
      task.completedAt = new Date();
      this.tasksProcessed++;

      this.complianceManager.log('TASK_COMPLETED', `Task ${task.id} completed`);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      this.complianceManager.log('TASK_FAILED', `Task ${task.id} failed: ${task.error}`);
    }

    this.emit('task:completed', task);
  }

  private async processCOMINT(_task: ProcessingTask): Promise<unknown> {
    // Generate simulated COMINT data
    const message = this.signalGenerator.generateCOMINTMessage({
      communicationType: 'VOICE',
      language: 'en'
    });

    // Analyze
    const analysis = await this.messageAnalyzer.analyze(message.content.transcription || '');

    // Map communications
    if (message.participants.length >= 2) {
      this.communicationsMapper.addCommunication({
        source: message.participants[0].identifier,
        sourceType: 'phone',
        target: message.participants[1].identifier,
        targetType: 'phone',
        timestamp: message.timestamp,
        type: 'voice'
      });
    }

    return {
      message,
      analysis,
      networkStats: this.communicationsMapper.calculateMetrics()
    };
  }

  private async processELINT(_task: ProcessingTask): Promise<unknown> {
    // Generate simulated ELINT data
    const report = this.signalGenerator.generateELINTReport();

    // Generate signal for analysis
    const signal = this.signalGenerator.generateRFSignal({
      signalType: 'RADAR',
      frequency: report.parameters.frequency
    });

    // Classify modulation
    const classification = signal.iqData
      ? this.modulationClassifier.classify(signal.iqData.i, signal.iqData.q)
      : null;

    return {
      report,
      signal: signal.metadata,
      classification
    };
  }

  private async processNetwork(_task: ProcessingTask): Promise<unknown> {
    // Generate simulated network traffic
    const packets = this.packetAnalyzer.generateSimulatedPackets(100);
    const flows = this.flowAnalyzer.generateSimulatedFlows(10);

    // Crypto analysis
    const encryptedTraffic = this.cryptoAnalyzer.generateSimulatedTraffic('web');

    // Traffic pattern analysis
    const session = this.trafficPatternAnalyzer.generateSimulatedSession('web-browsing', 60);

    return {
      packetStats: this.packetAnalyzer.getStatistics(),
      flowStats: this.flowAnalyzer.getStatistics(),
      encryptedTraffic,
      trafficSession: session
    };
  }

  private async processGeolocation(_task: ProcessingTask): Promise<unknown> {
    // Setup simulated sensors
    const sensors = [
      { id: 'S1', latitude: 38.9, longitude: -77.0, altitude: 100, timestampAccuracy: 10 },
      { id: 'S2', latitude: 38.95, longitude: -77.05, altitude: 100, timestampAccuracy: 10 },
      { id: 'S3', latitude: 38.85, longitude: -76.95, altitude: 100, timestampAccuracy: 10 }
    ];

    sensors.forEach(s => this.tdoaLocator.registerSensor(s));

    // Generate simulated measurements
    const measurements = sensors.map((s, i) => ({
      sensorId: s.id,
      arrivalTime: Date.now() * 1e6 + i * 100, // nanoseconds
      signalStrength: -60 + Math.random() * 20,
      frequency: 900e6,
      confidence: 0.8 + Math.random() * 0.15
    }));

    // Calculate position
    const location = this.tdoaLocator.calculatePosition(measurements);

    // Create track
    if (location) {
      this.trackManager.processLocation(location);
    }

    return {
      location,
      activeTracks: this.trackManager.getActiveTracks()
    };
  }

  /**
   * Get engine status
   */
  getStatus(): EngineStatus {
    return {
      mode: 'TRAINING',
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      tasksProcessed: this.tasksProcessed,
      activeCollectors: this.collectionManager.getCollectors().length,
      activeTracks: this.trackManager.getActiveTracks().length,
      complianceStatus: this.complianceManager.getComplianceStatus()
    };
  }

  /**
   * Generate training scenario
   */
  async generateTrainingScenario(type: 'basic' | 'advanced' | 'full'): Promise<{
    signals: unknown[];
    messages: unknown[];
    reports: unknown[];
    locations: unknown[];
  }> {
    const counts = {
      basic: { signals: 10, messages: 5, reports: 5, locations: 3 },
      advanced: { signals: 50, messages: 25, reports: 20, locations: 10 },
      full: { signals: 100, messages: 50, reports: 50, locations: 25 }
    };

    const config = counts[type];

    const signals = Array.from({ length: config.signals }, () =>
      this.signalGenerator.generateRFSignal({
        signalType: ['CELLULAR_4G', 'WIFI', 'RADAR', 'SATELLITE'][Math.floor(Math.random() * 4)] as any
      })
    );

    const messages = Array.from({ length: config.messages }, () =>
      this.signalGenerator.generateCOMINTMessage({
        communicationType: ['VOICE', 'SMS', 'EMAIL', 'RADIO'][Math.floor(Math.random() * 4)] as any
      })
    );

    const reports = Array.from({ length: config.reports }, () =>
      this.signalGenerator.generateELINTReport()
    );

    // Generate location data through tasks
    const locationPromises = Array.from({ length: config.locations }, async () => {
      const taskId = this.submitTask('GEOLOCATION', {}, 1);
      // Wait for completion
      return new Promise((resolve) => {
        const handler = (task: ProcessingTask) => {
          if (task.id === taskId) {
            this.removeListener('task:completed', handler);
            resolve(task.result);
          }
        };
        this.on('task:completed', handler);
      });
    });

    const locations = await Promise.all(locationPromises);

    this.complianceManager.log('SCENARIO_GENERATED', `Generated ${type} training scenario`);

    return { signals, messages, reports, locations };
  }

  // Expose analyzers for direct access
  getCollectionManager(): CollectionManager {
    return this.collectionManager;
  }

  getSpectrumMonitor(): SpectrumMonitor {
    return this.spectrumMonitor;
  }

  getCommunicationsMapper(): CommunicationsMapper {
    return this.communicationsMapper;
  }

  getTrackManager(): TrackManager {
    return this.trackManager;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
