"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigIntManager = void 0;
// @ts-nocheck
const SignalCollectionService_js_1 = require("./SignalCollectionService.js");
const SignalClassificationService_js_1 = require("./SignalClassificationService.js");
const SpectrumAnalysisService_js_1 = require("./SpectrumAnalysisService.js");
const GeolocationService_js_1 = require("./GeolocationService.js");
const DecryptionService_js_1 = require("./DecryptionService.js");
const SigIntRepository_js_1 = require("./persistence/SigIntRepository.js");
const comprehensive_telemetry_js_1 = require("../lib/telemetry/comprehensive-telemetry.js");
class SigIntManager {
    static instance;
    collectionService;
    classificationService;
    spectrumService;
    geolocationService;
    decryptionService;
    repository;
    constructor() {
        this.collectionService = SignalCollectionService_js_1.SignalCollectionService.getInstance();
        this.classificationService = SignalClassificationService_js_1.SignalClassificationService.getInstance();
        this.spectrumService = SpectrumAnalysisService_js_1.SpectrumAnalysisService.getInstance();
        this.geolocationService = GeolocationService_js_1.GeolocationService.getInstance();
        this.decryptionService = DecryptionService_js_1.DecryptionService.getInstance();
        this.repository = SigIntRepository_js_1.SigIntRepository.getInstance();
    }
    static getInstance() {
        if (!SigIntManager.instance) {
            SigIntManager.instance = new SigIntManager();
        }
        return SigIntManager.instance;
    }
    /**
     * Main entry point for processing a captured signal event.
     * In a full production system, this would be the Worker handler consuming a queue.
     * For the API handler, one would just push to the queue and return Accepted.
     */
    async processSignalEvent(rawInput) {
        const start = process.hrtime();
        // 1. Collection/Ingest
        const signal = this.collectionService.ingestSignal(rawInput);
        comprehensive_telemetry_js_1.telemetry.subsystems.sigint?.signalsIngested.add(1);
        // 2. Classification
        signal.classification = await this.classificationService.classifySignal(signal);
        signal.modulationType = await this.classificationService.analyzeModulation(signal);
        // 3. Spectrum Analysis
        const spreadInfo = this.spectrumService.analyzeSpreadSpectrum(signal);
        if (spreadInfo.type !== 'NONE') {
            signal.metadata = { ...signal.metadata, spreadSpectrum: spreadInfo };
        }
        // Get recent history for context (Jamming) from DB (or Cache in real system)
        const recentSignals = await this.repository.getRecentSignals(10);
        const jammingInfo = this.spectrumService.detectJamming([signal, ...recentSignals]);
        if (jammingInfo.isJammed) {
            signal.metadata = { ...signal.metadata, jamming: jammingInfo };
            comprehensive_telemetry_js_1.telemetry.subsystems.sigint?.jammingEvents.add(1);
        }
        // Assign Emitter ID (Correlation)
        // Simple logic: if not provided, bin by frequency band
        if (!signal.emitterId) {
            signal.emitterId = `EMIT-${Math.floor(signal.frequency / 1e6)}`;
        }
        // Check for Frequency Hopping (requires history of specific emitter)
        const emitterHistory = await this.repository.getSignalsByEmitter(signal.emitterId, 20);
        const hoppingInfo = this.spectrumService.detectFrequencyHopping([...emitterHistory, signal]);
        if (hoppingInfo.isHopping) {
            signal.metadata = { ...signal.metadata, frequencyHopping: hoppingInfo };
        }
        // 4. Geolocation / DF
        const sensorSim = { lat: 34.0, lon: 36.0, toa: 0 };
        signal.geolocation = this.geolocationService.performGeolocation(signal, [sensorSim]);
        // 5. COMINT / Decryption
        const comint = await this.decryptionService.decryptSignal(signal);
        if (comint.decrypted) {
            signal.content = comint.content;
            comprehensive_telemetry_js_1.telemetry.subsystems.sigint?.decryptions.add(1);
        }
        signal.metadata = { ...signal.metadata, ...this.decryptionService.extractMetadata(signal) };
        // 6. Persistence
        await this.updateEmitterDatabase(signal);
        await this.repository.logSignal(signal);
        // Record Metrics
        const end = process.hrtime(start);
        comprehensive_telemetry_js_1.telemetry.recordLatency('sigint_processing', end[0] * 1000 + end[1] / 1e6);
        return signal;
    }
    async getActiveEmitters() {
        return this.repository.getAllEmitters();
    }
    async getRecentSignals(limit = 50) {
        return this.repository.getRecentSignals(limit);
    }
    async performSpectrumScan(startFreq, stopFreq) {
        // Simulate scan result using recent data as 'live'
        const recent = await this.repository.getRecentSignals(100);
        return {
            range: { start: startFreq, stop: stopFreq },
            detected: recent.filter(s => s.frequency >= startFreq && s.frequency <= stopFreq),
            noiseFloor: -120 + Math.random() * 10
        };
    }
    async updateEmitterDatabase(signal) {
        if (!signal.emitterId)
            return;
        const existing = await this.repository.getEmitter(signal.emitterId);
        const emitter = existing || {
            id: signal.emitterId,
            name: signal.classification?.label || 'Unknown Emitter',
            type: signal.classification?.tags.join(',') || 'Unknown',
            status: 'ACTIVE',
            lastSeen: signal.timestamp,
            frequencyRange: { min: signal.frequency, max: signal.frequency },
            detectedModulations: [],
            location: signal.geolocation
        };
        // Merge Logic
        emitter.lastSeen = signal.timestamp;
        if (signal.modulationType && !emitter.detectedModulations.includes(signal.modulationType)) {
            emitter.detectedModulations.push(signal.modulationType);
        }
        if (signal.geolocation) {
            emitter.location = signal.geolocation; // Simple "Last location" update
        }
        emitter.frequencyRange.min = Math.min(emitter.frequencyRange.min, signal.frequency);
        emitter.frequencyRange.max = Math.max(emitter.frequencyRange.max, signal.frequency);
        await this.repository.upsertEmitter(emitter);
    }
}
exports.SigIntManager = SigIntManager;
