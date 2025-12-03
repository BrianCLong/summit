"use strict";
/**
 * Signal Collector - Base collection simulation
 * TRAINING/SIMULATION ONLY - No actual collection capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalCollector = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
class SignalCollector extends eventemitter3_1.EventEmitter {
    config;
    status = 'OFFLINE';
    activeTasks = new Map();
    collectedSignals = [];
    simulationInterval;
    constructor(config) {
        super();
        this.config = config;
    }
    async initialize() {
        this.setStatus('INITIALIZING');
        // Simulate initialization delay
        await this.delay(500);
        console.log(`[SIGINT] Collector ${this.config.name} initialized (SIMULATION MODE)`);
        this.setStatus('READY');
    }
    async startCollection(task) {
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
    async stopCollection(taskId) {
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
    startSimulation(task) {
        if (this.simulationInterval)
            return;
        this.simulationInterval = setInterval(() => {
            const signal = this.generateSimulatedSignal(task);
            this.collectedSignals.push(signal);
            this.emit('signal:received', signal);
        }, 1000 + Math.random() * 2000);
    }
    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = undefined;
        }
    }
    generateSimulatedSignal(task) {
        const targetFreq = task.targetFrequencies[0];
        const freq = targetFreq
            ? targetFreq.center + (Math.random() - 0.5) * targetFreq.bandwidth
            : 100e6 + Math.random() * 5900e6;
        const signalType = task.targetSignalTypes?.[Math.floor(Math.random() * task.targetSignalTypes.length)] || this.config.capabilities.signalTypes[Math.floor(Math.random() * this.config.capabilities.signalTypes.length)];
        const metadata = {
            id: (0, uuid_1.v4)(),
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
    generateSimulatedLocation(task) {
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
    inferCategory(signalType) {
        const comintTypes = [
            'CELLULAR_2G', 'CELLULAR_3G', 'CELLULAR_4G', 'CELLULAR_5G',
            'WIFI', 'BLUETOOTH', 'SATELLITE', 'SHORTWAVE', 'VHF', 'UHF'
        ];
        const elintTypes = ['RADAR', 'NAVIGATION', 'TELEMETRY'];
        if (comintTypes.includes(signalType))
            return 'COMINT';
        if (elintTypes.includes(signalType))
            return 'ELINT';
        return 'TECHINT';
    }
    setStatus(status) {
        this.status = status;
        this.emit('status:changed', status);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getStatus() {
        return this.status;
    }
    getConfig() {
        return { ...this.config };
    }
    getActiveTasks() {
        return Array.from(this.activeTasks.values());
    }
    getCollectedSignals() {
        return [...this.collectedSignals];
    }
    async shutdown() {
        this.stopSimulation();
        for (const taskId of this.activeTasks.keys()) {
            await this.stopCollection(taskId);
        }
        this.setStatus('OFFLINE');
        console.log(`[SIGINT] Collector ${this.config.name} shut down`);
    }
}
exports.SignalCollector = SignalCollector;
//# sourceMappingURL=SignalCollector.js.map