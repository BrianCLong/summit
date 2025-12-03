"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceFactory = exports.ExerciseDataSource = exports.TrainingFeedSource = exports.FileDataSource = exports.DataSourceAdapter = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
class DataSourceAdapter extends eventemitter3_1.EventEmitter {
    config;
    connected = false;
    authorizationValid = false;
    constructor(config) {
        super();
        this.config = config;
        this.validateAuthorization();
    }
    /**
     * Validate authorization before any data access
     */
    validateAuthorization() {
        const auth = this.config.authorization;
        const now = new Date();
        if (now < auth.validFrom || now > auth.validTo) {
            this.authorizationValid = false;
            this.emit('authorization:expired');
            return false;
        }
        // Check source type is authorized
        const allowedTypes = [
            'SIMULATION', 'FILE', 'TRAINING_FEED', 'DEFENSIVE', 'EXERCISE', 'REPLAY'
        ];
        if (!allowedTypes.includes(this.config.type)) {
            throw new Error(`Unauthorized data source type: ${this.config.type}`);
        }
        this.authorizationValid = true;
        return true;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.connected && this.authorizationValid;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.DataSourceAdapter = DataSourceAdapter;
/**
 * File-based data source for pre-recorded authorized data
 */
class FileDataSource extends DataSourceAdapter {
    filePath;
    fileReader;
    constructor(config) {
        super(config);
        this.filePath = config.filePath;
    }
    async connect() {
        if (!this.validateAuthorization()) {
            throw new Error('Authorization invalid or expired');
        }
        // Verify file exists and is authorized
        this.connected = true;
        this.emit('connected');
    }
    async disconnect() {
        await this.stopReceiving();
        this.connected = false;
        this.emit('disconnected');
    }
    async startReceiving() {
        if (!this.isConnected()) {
            throw new Error('Not connected');
        }
        // Simulate reading from file
        this.fileReader = setInterval(() => {
            const signal = this.generateFromFile();
            this.emit('data:received', signal);
        }, 1000);
    }
    async stopReceiving() {
        if (this.fileReader) {
            clearInterval(this.fileReader);
            this.fileReader = undefined;
        }
    }
    generateFromFile() {
        // Simulates reading pre-recorded data
        const metadata = {
            id: (0, uuid_1.v4)(),
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
exports.FileDataSource = FileDataSource;
/**
 * Training feed data source for real-time training data
 */
class TrainingFeedSource extends DataSourceAdapter {
    feedInterval;
    signalTypes;
    rate;
    constructor(config) {
        super(config);
        this.signalTypes = config.signalTypes || ['RF_DIGITAL', 'CELLULAR_4G', 'WIFI'];
        this.rate = config.rate || 1000;
    }
    async connect() {
        if (!this.validateAuthorization()) {
            throw new Error('Authorization invalid or expired');
        }
        this.connected = true;
        this.emit('connected');
    }
    async disconnect() {
        await this.stopReceiving();
        this.connected = false;
        this.emit('disconnected');
    }
    async startReceiving() {
        if (!this.isConnected()) {
            throw new Error('Not connected');
        }
        this.feedInterval = setInterval(() => {
            const signal = this.generateTrainingSignal();
            this.emit('data:received', signal);
        }, this.rate);
    }
    async stopReceiving() {
        if (this.feedInterval) {
            clearInterval(this.feedInterval);
            this.feedInterval = undefined;
        }
    }
    generateTrainingSignal() {
        const signalType = this.signalTypes[Math.floor(Math.random() * this.signalTypes.length)];
        const metadata = {
            id: (0, uuid_1.v4)(),
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
exports.TrainingFeedSource = TrainingFeedSource;
/**
 * Exercise data source for sanctioned exercises
 */
class ExerciseDataSource extends DataSourceAdapter {
    exerciseId;
    scenarioData = [];
    playbackIndex = 0;
    playbackInterval;
    constructor(config) {
        super(config);
        this.exerciseId = config.exerciseId;
    }
    async connect() {
        if (!this.validateAuthorization()) {
            throw new Error('Authorization invalid or expired');
        }
        // Load exercise scenario
        this.loadExerciseScenario();
        this.connected = true;
        this.emit('connected');
    }
    async disconnect() {
        await this.stopReceiving();
        this.connected = false;
        this.emit('disconnected');
    }
    async startReceiving() {
        if (!this.isConnected()) {
            throw new Error('Not connected');
        }
        this.playbackIndex = 0;
        this.playbackInterval = setInterval(() => {
            if (this.playbackIndex < this.scenarioData.length) {
                this.emit('data:received', this.scenarioData[this.playbackIndex]);
                this.playbackIndex++;
            }
            else {
                // Loop or stop
                this.playbackIndex = 0;
            }
        }, 500);
    }
    async stopReceiving() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = undefined;
        }
    }
    loadExerciseScenario() {
        // Generate exercise scenario data
        const signalTypes = [
            'CELLULAR_4G', 'WIFI', 'RADAR', 'SATELLITE', 'VHF'
        ];
        for (let i = 0; i < 100; i++) {
            const metadata = {
                id: (0, uuid_1.v4)(),
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
    getExerciseId() {
        return this.exerciseId;
    }
    getProgress() {
        return {
            current: this.playbackIndex,
            total: this.scenarioData.length
        };
    }
}
exports.ExerciseDataSource = ExerciseDataSource;
/**
 * Factory for creating data source adapters
 */
class DataSourceFactory {
    static create(config) {
        switch (config.type) {
            case 'FILE':
                return new FileDataSource(config);
            case 'TRAINING_FEED':
            case 'SIMULATION':
                return new TrainingFeedSource(config);
            case 'EXERCISE':
                return new ExerciseDataSource(config);
            default:
                throw new Error(`Unsupported data source type: ${config.type}`);
        }
    }
    static createTrainingSource(name) {
        return new TrainingFeedSource({
            id: (0, uuid_1.v4)(),
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
exports.DataSourceFactory = DataSourceFactory;
//# sourceMappingURL=DataSourceAdapter.js.map