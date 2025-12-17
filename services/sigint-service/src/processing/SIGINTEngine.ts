/**
 * SIGINT Engine - Core processing orchestrator
 * TRAINING/SIMULATION ONLY
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import {
  CollectionManager,
  SignalGenerator,
  SpectrumMonitor,
  ExerciseManager,
  DataSourceFactory,
  RawSignal
} from '@summit/sigint-collector';
import { ModulationClassifier, SpectralAnalyzer } from '@summit/rf-processor';
import { VoiceAnalyzer, MessageAnalyzer, CommunicationsMapper } from '@summit/comint-analyzer';
import { PacketAnalyzer, FlowAnalyzer, DNSAnalyzer } from '@summit/network-interceptor';
import { CryptoAnalyzer, TrafficPatternAnalyzer } from '@summit/cryptanalysis-engine';
import { TDOALocator, TrackManager, Triangulator } from '@summit/geolocation-engine';
import { ComplianceManager } from '../compliance/ComplianceManager';
import { ReportGenerator } from '../reporting/ReportGenerator';
import { VisualizationDataGenerator } from '../visualization/VisualizationData';

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
  activeExercise?: string;
  complianceStatus: 'compliant' | 'warning' | 'violation';
}

export class SIGINTEngine extends EventEmitter {
  private complianceManager: ComplianceManager;

  // Collection
  private collectionManager: CollectionManager;
  private signalGenerator: SignalGenerator;
  private spectrumMonitor: SpectrumMonitor;
  private exerciseManager: ExerciseManager;

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
  private dnsAnalyzer: DNSAnalyzer;

  // Crypto
  private cryptoAnalyzer: CryptoAnalyzer;
  private trafficPatternAnalyzer: TrafficPatternAnalyzer;

  // Geolocation
  private tdoaLocator: TDOALocator;
  private trackManager: TrackManager;
  private triangulator: Triangulator;

  // Reporting & Visualization
  private reportGenerator: ReportGenerator;
  private visualizationGenerator: VisualizationDataGenerator;

  // State
  private status: EngineStatus['status'] = 'stopped';
  private startTime?: Date;
  private tasksProcessed: number = 0;
  private taskQueue: ProcessingTask[] = [];
  private processingActive: boolean = false;

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
    this.exerciseManager = new ExerciseManager();

    this.modulationClassifier = new ModulationClassifier();
    this.spectralAnalyzer = new SpectralAnalyzer({ sampleRate: 1e6 });

    this.voiceAnalyzer = new VoiceAnalyzer();
    this.messageAnalyzer = new MessageAnalyzer();
    this.communicationsMapper = new CommunicationsMapper();

    this.packetAnalyzer = new PacketAnalyzer();
    this.flowAnalyzer = new FlowAnalyzer();
    this.dnsAnalyzer = new DNSAnalyzer();

    this.cryptoAnalyzer = new CryptoAnalyzer();
    this.trafficPatternAnalyzer = new TrafficPatternAnalyzer();

    this.tdoaLocator = new TDOALocator();
    this.trackManager = new TrackManager();
    this.triangulator = new Triangulator();

    this.reportGenerator = new ReportGenerator();
    this.visualizationGenerator = new VisualizationDataGenerator();

    this.setupEventHandlers();
    this.complianceManager.log('ENGINE_INIT', 'SIGINT Engine initialized in TRAINING mode');
  }

  private setupEventHandlers(): void {
    this.collectionManager.on('signal:collected', (signal: RawSignal) => {
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

    this.exerciseManager.on('exercise:started', (exercise) => {
      this.emit('exercise:started', exercise);
      this.complianceManager.log('EXERCISE_STARTED', `Exercise ${exercise.id} started`);
    });

    this.exerciseManager.on('signal:generated', (signal) => {
      this.emit('signal:collected', signal);
    });
  }

  async start(): Promise<void> {
    if (this.status === 'running') return;

    this.status = 'running';
    this.startTime = new Date();
    this.spectrumMonitor.start();
    this.processingActive = true;

    this.complianceManager.log('ENGINE_START', 'SIGINT Engine started');
    this.emit('status:changed', this.getStatus());

    // Start task processor
    this.processTaskQueue();
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
    this.processingActive = false;
    this.spectrumMonitor.stop();
    await this.collectionManager.shutdown();

    // End any active exercise
    const activeExercise = this.exerciseManager.getActiveExercise();
    if (activeExercise) {
      this.exerciseManager.endExercise(activeExercise.id);
    }

    this.complianceManager.log('ENGINE_STOP', 'SIGINT Engine stopped');
    this.emit('status:changed', this.getStatus());
  }

  pause(): void {
    this.status = 'paused';
    this.processingActive = false;
    this.spectrumMonitor.stop();
    this.emit('status:changed', this.getStatus());
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.processingActive = true;
      this.spectrumMonitor.start();
      this.processTaskQueue();
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
    while (this.processingActive) {
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
    const message = this.signalGenerator.generateCOMINTMessage({
      communicationType: 'VOICE',
      language: 'en'
    });

    const analysis = await this.messageAnalyzer.analyze(message.content.transcription || '');

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
    const report = this.signalGenerator.generateELINTReport();
    const signal = this.signalGenerator.generateRFSignal({
      signalType: 'RADAR',
      frequency: report.parameters.frequency
    });

    const classification = signal.iqData
      ? this.modulationClassifier.classify(signal.iqData.i, signal.iqData.q)
      : null;

    return { report, signal: signal.metadata, classification };
  }

  private async processNetwork(_task: ProcessingTask): Promise<unknown> {
    const packets = this.packetAnalyzer.generateSimulatedPackets(100);
    const flows = this.flowAnalyzer.generateSimulatedFlows(10);
    const dnsTraffic = this.dnsAnalyzer.generateSimulatedTraffic(50, true);
    const encryptedTraffic = this.cryptoAnalyzer.generateSimulatedTraffic('web');
    const session = this.trafficPatternAnalyzer.generateSimulatedSession('web-browsing', 60);

    return {
      packetStats: this.packetAnalyzer.getStatistics(),
      flowStats: this.flowAnalyzer.getStatistics(),
      dnsStats: this.dnsAnalyzer.getStatistics(),
      dnsThreats: dnsTraffic.threats,
      encryptedTraffic,
      trafficSession: session
    };
  }

  private async processGeolocation(_task: ProcessingTask): Promise<unknown> {
    const sensors = [
      { id: 'S1', latitude: 38.9, longitude: -77.0, altitude: 100, timestampAccuracy: 10 },
      { id: 'S2', latitude: 38.95, longitude: -77.05, altitude: 100, timestampAccuracy: 10 },
      { id: 'S3', latitude: 38.85, longitude: -76.95, altitude: 100, timestampAccuracy: 10 }
    ];

    sensors.forEach(s => this.tdoaLocator.registerSensor(s));

    const measurements = sensors.map((s, i) => ({
      sensorId: s.id,
      arrivalTime: Date.now() * 1e6 + i * 100,
      signalStrength: -60 + Math.random() * 20,
      frequency: 900e6,
      confidence: 0.8 + Math.random() * 0.15
    }));

    const location = this.tdoaLocator.calculatePosition(measurements);

    if (location) {
      this.trackManager.processLocation(location);
    }

    return { location, activeTracks: this.trackManager.getActiveTracks() };
  }

  /**
   * Get engine status
   */
  getStatus(): EngineStatus {
    const activeExercise = this.exerciseManager.getActiveExercise();
    return {
      mode: activeExercise ? 'EXERCISE' : 'TRAINING',
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      tasksProcessed: this.tasksProcessed,
      activeCollectors: this.collectionManager.getCollectors().length,
      activeTracks: this.trackManager.getActiveTracks().length,
      activeExercise: activeExercise?.id,
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

    const locations: unknown[] = [];
    for (let i = 0; i < config.locations; i++) {
      const result = await this.processGeolocation({ id: uuid(), type: 'GEOLOCATION', status: 'pending', priority: 1, createdAt: new Date() });
      locations.push(result);
    }

    this.complianceManager.log('SCENARIO_GENERATED', `Generated ${type} training scenario`);

    return { signals, messages, reports, locations };
  }

  /**
   * Generate intelligence report
   */
  generateReport(params: Parameters<ReportGenerator['generateReport']>[0]) {
    return this.reportGenerator.generateReport(params);
  }

  /**
   * Get visualization data
   */
  getVisualizationData() {
    return {
      spectrum: this.visualizationGenerator.generateSpectrumData({
        startFreq: 30e6,
        stopFreq: 6e9,
        signals: [
          { freq: 900e6, power: -40, bw: 10e6 },
          { freq: 2.4e9, power: -50, bw: 20e6 },
          { freq: 5.8e9, power: -55, bw: 40e6 }
        ]
      }),
      network: this.visualizationGenerator.generateNetworkGraphData({
        nodeCount: this.communicationsMapper.getNodes().length || 20,
        edgeDensity: 0.2
      }),
      map: this.visualizationGenerator.generateMapData({
        centerLat: 38.9,
        centerLon: -77.0,
        radius: 50,
        markerCount: this.trackManager.getActiveTracks().length || 5,
        showHeatmap: true,
        showTracks: true
      }),
      timeline: this.visualizationGenerator.generateTimelineData({
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        eventCount: 20
      }),
      dashboard: this.visualizationGenerator.generateDashboardLayout('SIGINT Operations')
    };
  }

  // Expose managers for direct access
  getCollectionManager(): CollectionManager { return this.collectionManager; }
  getSpectrumMonitor(): SpectrumMonitor { return this.spectrumMonitor; }
  getCommunicationsMapper(): CommunicationsMapper { return this.communicationsMapper; }
  getTrackManager(): TrackManager { return this.trackManager; }
  getExerciseManager(): ExerciseManager { return this.exerciseManager; }
  getReportGenerator(): ReportGenerator { return this.reportGenerator; }
  getVisualizationGenerator(): VisualizationDataGenerator { return this.visualizationGenerator; }
  getDNSAnalyzer(): DNSAnalyzer { return this.dnsAnalyzer; }
  getTriangulator(): Triangulator { return this.triangulator; }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
