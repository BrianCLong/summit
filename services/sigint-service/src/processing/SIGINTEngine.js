"use strict";
/**
 * SIGINT Engine - Core processing orchestrator
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGINTEngine = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const sigint_collector_1 = require("@intelgraph/sigint-collector");
const sigint_collector_2 = require("@intelgraph/sigint-collector");
const sigint_collector_3 = require("@intelgraph/sigint-collector");
const rf_processor_1 = require("@intelgraph/rf-processor");
const rf_processor_2 = require("@intelgraph/rf-processor");
const comint_analyzer_1 = require("@intelgraph/comint-analyzer");
const comint_analyzer_2 = require("@intelgraph/comint-analyzer");
const comint_analyzer_3 = require("@intelgraph/comint-analyzer");
const network_interceptor_1 = require("@intelgraph/network-interceptor");
const network_interceptor_2 = require("@intelgraph/network-interceptor");
const cryptanalysis_engine_1 = require("@intelgraph/cryptanalysis-engine");
const cryptanalysis_engine_2 = require("@intelgraph/cryptanalysis-engine");
const geolocation_engine_1 = require("@intelgraph/geolocation-engine");
const geolocation_engine_2 = require("@intelgraph/geolocation-engine");
class SIGINTEngine extends events_1.EventEmitter {
    complianceManager;
    // Collection
    collectionManager;
    signalGenerator;
    spectrumMonitor;
    // RF Processing
    modulationClassifier;
    spectralAnalyzer;
    // COMINT
    voiceAnalyzer;
    messageAnalyzer;
    communicationsMapper;
    // Network
    packetAnalyzer;
    flowAnalyzer;
    // Crypto
    cryptoAnalyzer;
    trafficPatternAnalyzer;
    // Geolocation
    tdoaLocator;
    trackManager;
    // State
    status = 'stopped';
    startTime;
    tasksProcessed = 0;
    taskQueue = [];
    constructor(complianceManager) {
        super();
        this.complianceManager = complianceManager;
        // Initialize all components
        this.collectionManager = new sigint_collector_1.CollectionManager({ complianceMode: 'TRAINING' });
        this.signalGenerator = new sigint_collector_2.SignalGenerator({ realism: 'HIGH', includeNoise: true });
        this.spectrumMonitor = new sigint_collector_3.SpectrumMonitor({
            startFrequency: 30e6,
            endFrequency: 6e9,
            resolution: 100e3,
            sweepRate: 1,
            sensitivity: -80
        });
        this.modulationClassifier = new rf_processor_1.ModulationClassifier();
        this.spectralAnalyzer = new rf_processor_2.SpectralAnalyzer({ sampleRate: 1e6 });
        this.voiceAnalyzer = new comint_analyzer_1.VoiceAnalyzer();
        this.messageAnalyzer = new comint_analyzer_2.MessageAnalyzer();
        this.communicationsMapper = new comint_analyzer_3.CommunicationsMapper();
        this.packetAnalyzer = new network_interceptor_1.PacketAnalyzer();
        this.flowAnalyzer = new network_interceptor_2.FlowAnalyzer();
        this.cryptoAnalyzer = new cryptanalysis_engine_1.CryptoAnalyzer();
        this.trafficPatternAnalyzer = new cryptanalysis_engine_2.TrafficPatternAnalyzer();
        this.tdoaLocator = new geolocation_engine_1.TDOALocator();
        this.trackManager = new geolocation_engine_2.TrackManager();
        this.setupEventHandlers();
        this.complianceManager.log('ENGINE_INIT', 'SIGINT Engine initialized in TRAINING mode');
    }
    setupEventHandlers() {
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
    async start() {
        if (this.status === 'running')
            return;
        this.status = 'running';
        this.startTime = new Date();
        this.spectrumMonitor.start();
        this.complianceManager.log('ENGINE_START', 'SIGINT Engine started');
        this.emit('status:changed', this.getStatus());
        // Start task processor
        this.processTaskQueue();
    }
    async stop() {
        this.status = 'stopped';
        this.spectrumMonitor.stop();
        await this.collectionManager.shutdown();
        this.complianceManager.log('ENGINE_STOP', 'SIGINT Engine stopped');
        this.emit('status:changed', this.getStatus());
    }
    pause() {
        this.status = 'paused';
        this.spectrumMonitor.stop();
        this.emit('status:changed', this.getStatus());
    }
    resume() {
        if (this.status === 'paused') {
            this.status = 'running';
            this.spectrumMonitor.start();
            this.emit('status:changed', this.getStatus());
        }
    }
    /**
     * Submit a processing task
     */
    submitTask(type, data, priority = 3) {
        const task = {
            id: (0, uuid_1.v4)(),
            type,
            status: 'pending',
            priority,
            createdAt: new Date()
        };
        // Insert by priority
        const insertIdx = this.taskQueue.findIndex(t => t.priority > priority);
        if (insertIdx === -1) {
            this.taskQueue.push(task);
        }
        else {
            this.taskQueue.splice(insertIdx, 0, task);
        }
        this.complianceManager.log('TASK_SUBMITTED', `Task ${task.id} of type ${type} submitted`);
        return task.id;
    }
    async processTaskQueue() {
        while (this.status === 'running') {
            if (this.taskQueue.length > 0) {
                const task = this.taskQueue.shift();
                await this.processTask(task);
            }
            await this.delay(100);
        }
    }
    async processTask(task) {
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
        }
        catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : 'Unknown error';
            this.complianceManager.log('TASK_FAILED', `Task ${task.id} failed: ${task.error}`);
        }
        this.emit('task:completed', task);
    }
    async processCOMINT(_task) {
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
    async processELINT(_task) {
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
    async processNetwork(_task) {
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
    async processGeolocation(_task) {
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
    getStatus() {
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
    async generateTrainingScenario(type) {
        const counts = {
            basic: { signals: 10, messages: 5, reports: 5, locations: 3 },
            advanced: { signals: 50, messages: 25, reports: 20, locations: 10 },
            full: { signals: 100, messages: 50, reports: 50, locations: 25 }
        };
        const config = counts[type];
        const signals = Array.from({ length: config.signals }, () => this.signalGenerator.generateRFSignal({
            signalType: ['CELLULAR_4G', 'WIFI', 'RADAR', 'SATELLITE'][Math.floor(Math.random() * 4)]
        }));
        const messages = Array.from({ length: config.messages }, () => this.signalGenerator.generateCOMINTMessage({
            communicationType: ['VOICE', 'SMS', 'EMAIL', 'RADIO'][Math.floor(Math.random() * 4)]
        }));
        const reports = Array.from({ length: config.reports }, () => this.signalGenerator.generateELINTReport());
        // Generate location data through tasks
        const locationPromises = Array.from({ length: config.locations }, async () => {
            const taskId = this.submitTask('GEOLOCATION', {}, 1);
            // Wait for completion
            return new Promise((resolve) => {
                const handler = (task) => {
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
    getCollectionManager() {
        return this.collectionManager;
    }
    getSpectrumMonitor() {
        return this.spectrumMonitor;
    }
    getCommunicationsMapper() {
        return this.communicationsMapper;
    }
    getTrackManager() {
        return this.trackManager;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.SIGINTEngine = SIGINTEngine;
