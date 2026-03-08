"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronicWarfareService = void 0;
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Electronic Warfare Service
 *
 * Manages the electromagnetic spectrum operations including Electronic Attack (EA),
 * Electronic Protection (EP), and Electronic Support (ES).
 */
class ElectronicWarfareService extends events_1.EventEmitter {
    assets = new Map();
    signals = new Map();
    activeJammers = new Map();
    signalHistory = [];
    constructor() {
        super();
        logger_js_1.default.info('Electronic Warfare Service initialized.');
    }
    /**
     * Registers a new friendly or neutral EW asset in the battle management system.
     */
    registerAsset(asset) {
        this.assets.set(asset.id, { ...asset, activeProtection: [] });
        logger_js_1.default.info(`EW Asset registered: ${asset.name} (${asset.id})`);
        this.emit('assetRegistered', asset);
    }
    /**
     * Updates the location of an asset.
     */
    updateAssetLocation(assetId, location) {
        const asset = this.assets.get(assetId);
        if (asset) {
            asset.location = location;
            this.assets.set(assetId, asset);
            this.emit('assetMoved', { assetId, location });
        }
    }
    /**
     * Simulates the detection of a signal in the spectrum.
     * (Electronic Support / Signals Intelligence)
     */
    detectSignal(signal) {
        this.signals.set(signal.id, signal);
        logger_js_1.default.info(`Signal detected: ${signal.id} at ${signal.frequency}MHz`);
        this.emit('signalDetected', signal);
        // Automatically attempt initial analysis if we have passive sensors
        const passiveSensors = Array.from(this.assets.values()).filter((a) => a.status !== 'OFFLINE');
        if (passiveSensors.length > 0) {
            this.analyzeSignal(signal.id);
        }
    }
    /**
     * Analyzes a specific signal to determine its characteristics.
     * (Pulse Analysis / ELINT / SIGINT)
     */
    analyzeSignal(signalId) {
        const signal = this.signals.get(signalId);
        if (!signal)
            return null;
        // Simulate analysis logic based on signal properties
        const isRadar = signal.type === 'RADAR' || signal.frequency > 1000;
        const isEncrypted = Math.random() > 0.5;
        const report = {
            id: `INT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            signalId: signal.id,
            interceptTime: new Date(),
            analyzedType: signal.type,
            confidence: 0.85 + Math.random() * 0.1,
            content: isEncrypted ? 'ENCRYPTED_DATA' : signal.content || 'NO_CONTENT',
            parameters: {
                pri: isRadar ? Math.random() * 1000 : undefined,
                pw: isRadar ? Math.random() * 50 : undefined,
                encryptionType: isEncrypted ? 'AES-256' : 'NONE',
            },
        };
        this.signalHistory.push(report);
        logger_js_1.default.info(`Signal analyzed: ${signalId} identified as ${report.analyzedType}`);
        this.emit('signalAnalyzed', report);
        return report;
    }
    /**
     * Performs Direction Finding (DF) on a signal using registered sensors.
     * Uses simulated Time Difference of Arrival (TDOA) logic.
     */
    triangulateSignal(signalId) {
        const signal = this.signals.get(signalId);
        if (!signal) {
            logger_js_1.default.warn(`Cannot triangulate unknown signal: ${signalId}`);
            return null;
        }
        // Need at least 2 active assets with sensing capabilities to triangulate
        const activeSensors = Array.from(this.assets.values()).filter((a) => a.status === 'ACTIVE' || a.status === 'PASSIVE');
        if (activeSensors.length < 2) {
            logger_js_1.default.warn('Insufficient sensors for triangulation.');
            return null;
        }
        // Simulate triangulation result
        // Accuracy improves with more sensors and closer proximity (simulated)
        const errorRadius = 1000 / Math.pow(activeSensors.length, 1.5);
        const result = {
            signalId,
            estimatedLocation: signal.location || { lat: 0, lon: 0 },
            errorRadius,
            triangulationPoints: activeSensors.length,
            timestamp: new Date(),
        };
        logger_js_1.default.info(`Signal ${signalId} triangulated with ${result.triangulationPoints} sensors. Error: ${errorRadius.toFixed(1)}m`);
        this.emit('directionFound', result);
        return result;
    }
    /**
     * Calculates the Jamming-to-Signal (J/S) ratio to estimate effectiveness.
     * This is a simplified physics model.
     */
    calculateJammingEffectiveness(jammer, mission) {
        // 1. Check if jammer covers the target frequency
        if (mission.targetFrequency < jammer.frequencyRange[0] ||
            mission.targetFrequency > jammer.frequencyRange[1]) {
            return 0.0;
        }
        // 2. Base effectiveness on power and technique
        let effectiveness = mission.powerOutput / jammer.maxPower;
        // 3. Technique modifiers
        switch (mission.effect) {
            case 'SPOT_JAMMING':
                effectiveness *= 1.0; // High concentration
                break;
            case 'BARRAGE_JAMMING':
                effectiveness *= 0.4; // Spread out power
                break;
            case 'DRFM_REPEATER':
                effectiveness *= 0.9; // High sophistication
                break;
            case 'NOISE_JAMMING':
                effectiveness *= 0.6; // Brute force
                break;
            default:
                effectiveness *= 0.5;
        }
        // 4. Random environmental factors (fading, multipath)
        effectiveness *= 0.8 + Math.random() * 0.4;
        return Math.min(Math.max(effectiveness, 0), 1);
    }
    /**
     * Executes an Electronic Attack (Jamming).
     */
    deployJammer(assetId, targetFrequency, bandwidth, effect, durationSeconds = 60) {
        const asset = this.assets.get(assetId);
        if (!asset)
            throw new Error('Asset not found');
        if (!asset.capabilities.includes(effect)) {
            throw new Error(`Asset ${asset.name} does not support effect ${effect}`);
        }
        if (asset.status === 'OFFLINE' || asset.status === 'DAMAGED') {
            throw new Error('Asset is not operational');
        }
        const mission = {
            id: `JAM-${Date.now()}-${Math.floor(Math.random() * 100)}`,
            assetId,
            targetFrequency,
            bandwidth,
            effect,
            startTime: new Date(),
            durationSeconds,
            powerOutput: asset.maxPower * 0.9, // Run at 90% power by default
            status: 'ACTIVE',
            effectiveness: 0,
        };
        // Calculate initial effectiveness
        mission.effectiveness = this.calculateJammingEffectiveness(asset, mission);
        this.activeJammers.set(mission.id, mission);
        logger_js_1.default.info(`Jamming mission started: ${effect} on ${targetFrequency}MHz by ${asset.name} (Eff: ${mission.effectiveness.toFixed(2)})`);
        this.emit('jammingStarted', mission);
        // Schedule auto-stop
        setTimeout(() => {
            this.stopJammer(mission.id);
        }, durationSeconds * 1000);
        return mission;
    }
    /**
     * Stops an active jamming mission.
     */
    stopJammer(missionId) {
        const mission = this.activeJammers.get(missionId);
        if (mission && mission.status === 'ACTIVE') {
            mission.status = 'COMPLETED';
            this.activeJammers.set(missionId, mission); // Update state
            logger_js_1.default.info(`Jamming mission completed: ${missionId}`);
            this.emit('jammingStopped', mission);
        }
    }
    /**
     * Specialized method for Communication Disruption.
     */
    disruptCommunications(assetId, targetFreq) {
        return this.deployJammer(assetId, targetFreq, 0.025, // Narrowband 25kHz
        'COMM_DISRUPTION', 30);
    }
    /**
     * Specialized method for Radar Jamming.
     */
    jamRadar(assetId, targetFreq) {
        return this.deployJammer(assetId, targetFreq, 10, // Wideband 10MHz
        'NOISE_JAMMING', 45);
    }
    /**
     * Activates Electronic Protection (EP) measures for an asset.
     * e.g., Frequency Hopping, Power Management.
     */
    activateProtection(assetId, measure) {
        const asset = this.assets.get(assetId);
        if (!asset)
            throw new Error('Asset not found');
        if (!asset.activeProtection.includes(measure)) {
            asset.activeProtection.push(measure);
            this.assets.set(assetId, asset);
            logger_js_1.default.info(`Activating EP measure ${measure} for asset ${asset.name}`);
            this.emit('protectionActivated', { assetId, measure });
        }
    }
    /**
     * Deactivates an EP measure.
     */
    deactivateProtection(assetId, measure) {
        const asset = this.assets.get(assetId);
        if (!asset)
            return;
        asset.activeProtection = asset.activeProtection.filter((m) => m !== measure);
        this.assets.set(assetId, asset);
        this.emit('protectionDeactivated', { assetId, measure });
    }
    /**
     * Electromagnetic Battle Management (EMBM).
     * Returns a situational awareness report of the spectrum.
     */
    getBattleSpacePicture() {
        const signals = Array.from(this.signals.values());
        const utilization = signals.length > 0 ? Math.min(signals.length * 0.1, 1.0) : 0; // Simulated
        return {
            timestamp: new Date(),
            assets: Array.from(this.assets.values()),
            signals: signals,
            activeJammers: Array.from(this.activeJammers.values()).filter((j) => j.status === 'ACTIVE'),
            intercepts: this.signalHistory.slice(-50), // Last 50 intercepts
            spectrumUtilization: utilization,
        };
    }
    /**
     * Simulates an EMP analysis impact assessment (Theoretical).
     */
    analyzeEMPBlast(location, yieldKt) {
        const radiusKm = Math.sqrt(yieldKt) * 4; // Rudimentary scaling
        const affectedAssets = Array.from(this.assets.values()).filter((asset) => {
            // Simple distance calculation (ignoring earth curvature for short distances)
            const latDiff = (asset.location.lat - location.lat) * 111;
            const lonDiff = (asset.location.lon - location.lon) *
                111 *
                Math.cos(location.lat * (Math.PI / 180));
            const distKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            return distKm < radiusKm;
        });
        const report = {
            event: 'EMP_ANALYSIS',
            origin: location,
            yieldKt,
            estimatedRadiusKm: radiusKm,
            assetsAtRisk: affectedAssets.map((a) => a.id),
            timestamp: new Date(),
        };
        logger_js_1.default.warn(`EMP Analysis generated. Estimated ${affectedAssets.length} assets at risk.`);
        return report;
    }
}
exports.ElectronicWarfareService = ElectronicWarfareService;
exports.default = new ElectronicWarfareService();
