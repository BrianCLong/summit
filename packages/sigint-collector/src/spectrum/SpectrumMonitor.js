"use strict";
/**
 * Spectrum Monitor - RF spectrum analysis simulation
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectrumMonitor = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
class SpectrumMonitor extends eventemitter3_1.EventEmitter {
    config;
    running = false;
    sweepInterval;
    detectedSignals = new Map();
    emitterProfiles = new Map();
    baselineSpectrum;
    sweepCount = 0;
    // Simulated signal sources for training
    simulatedSources = [];
    constructor(config) {
        super();
        this.config = config;
        this.initializeSimulatedSources();
    }
    initializeSimulatedSources() {
        // Create realistic simulated signal sources for training
        const sources = [
            // Commercial FM broadcast
            { frequency: 88.5e6, bandwidth: 200e3, power: -30, modulation: 'FM' },
            { frequency: 95.1e6, bandwidth: 200e3, power: -35, modulation: 'FM' },
            { frequency: 101.5e6, bandwidth: 200e3, power: -28, modulation: 'FM' },
            // VHF communications
            { frequency: 121.5e6, bandwidth: 25e3, power: -60, modulation: 'AM' }, // Aviation emergency
            { frequency: 156.8e6, bandwidth: 25e3, power: -55, modulation: 'FM' }, // Marine Ch16
            // Cellular bands (simulated)
            { frequency: 850e6, bandwidth: 5e6, power: -45, modulation: 'OFDM', intermittent: true },
            { frequency: 1900e6, bandwidth: 10e6, power: -50, modulation: 'OFDM', intermittent: true },
            // WiFi
            { frequency: 2.437e9, bandwidth: 20e6, power: -40, modulation: 'OFDM', intermittent: true },
            { frequency: 5.18e9, bandwidth: 40e6, power: -45, modulation: 'OFDM', intermittent: true },
            // Simulated radar
            { frequency: 9.4e9, bandwidth: 2e6, power: -35, modulation: 'PULSE', intermittent: true },
            // Satellite downlink (simulated)
            { frequency: 12.5e9, bandwidth: 36e6, power: -70, modulation: 'QPSK' },
        ];
        this.simulatedSources = sources.map(s => ({ ...s, active: true }));
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        const intervalMs = 1000 / this.config.sweepRate;
        this.sweepInterval = setInterval(() => {
            this.performSweep();
        }, intervalMs);
        console.log(`[SPECTRUM] Monitor started: ${this.formatFreq(this.config.startFrequency)} - ${this.formatFreq(this.config.endFrequency)}`);
    }
    stop() {
        if (this.sweepInterval) {
            clearInterval(this.sweepInterval);
            this.sweepInterval = undefined;
        }
        this.running = false;
        console.log('[SPECTRUM] Monitor stopped');
    }
    performSweep() {
        const binCount = Math.ceil((this.config.endFrequency - this.config.startFrequency) / this.config.resolution);
        const powerLevels = new Array(binCount).fill(0).map(() => {
            // Base noise floor
            return -100 + Math.random() * 10;
        });
        // Add simulated signals
        for (const source of this.simulatedSources) {
            if (!source.active)
                continue;
            if (source.intermittent && Math.random() > 0.7)
                continue;
            const binIndex = Math.floor((source.frequency - this.config.startFrequency) / this.config.resolution);
            const binWidth = Math.ceil(source.bandwidth / this.config.resolution);
            if (binIndex >= 0 && binIndex < binCount) {
                for (let i = -binWidth / 2; i <= binWidth / 2; i++) {
                    const idx = binIndex + Math.floor(i);
                    if (idx >= 0 && idx < binCount) {
                        const distance = Math.abs(i) / (binWidth / 2);
                        const rolloff = Math.exp(-2 * distance * distance);
                        powerLevels[idx] = Math.max(powerLevels[idx], source.power + rolloff * 10 + (Math.random() - 0.5) * 3);
                    }
                }
            }
        }
        // Detect peaks
        const peaks = this.detectPeaks(powerLevels);
        const spectrumData = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            startFrequency: this.config.startFrequency,
            endFrequency: this.config.endFrequency,
            resolution: this.config.resolution,
            powerLevels,
            peakFrequencies: peaks,
            isSimulated: true
        };
        this.emit('sweep:complete', spectrumData);
        this.updateSignalDetections(peaks);
        this.sweepCount++;
        // Periodically check for anomalies
        if (this.sweepCount % 10 === 0) {
            this.checkForAnomalies(powerLevels);
        }
    }
    detectPeaks(powerLevels) {
        const peaks = [];
        const threshold = this.config.sensitivity;
        for (let i = 1; i < powerLevels.length - 1; i++) {
            if (powerLevels[i] > threshold &&
                powerLevels[i] > powerLevels[i - 1] &&
                powerLevels[i] > powerLevels[i + 1]) {
                peaks.push({
                    frequency: this.config.startFrequency + i * this.config.resolution,
                    power: powerLevels[i]
                });
            }
        }
        return peaks;
    }
    updateSignalDetections(peaks) {
        const now = new Date();
        const toleranceHz = this.config.resolution * 3;
        // Update existing signals or detect new ones
        for (const peak of peaks) {
            let matched = false;
            for (const [id, signal] of this.detectedSignals) {
                if (Math.abs(signal.frequency - peak.frequency) < toleranceHz) {
                    signal.lastDetected = now;
                    signal.power = peak.power;
                    signal.active = true;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const newSignal = {
                    id: (0, uuid_1.v4)(),
                    frequency: peak.frequency,
                    bandwidth: this.estimateBandwidth(peak.frequency),
                    power: peak.power,
                    snr: peak.power + 100, // Relative to noise floor
                    firstDetected: now,
                    lastDetected: now,
                    active: true
                };
                this.detectedSignals.set(newSignal.id, newSignal);
                this.emit('signal:detected', newSignal);
            }
        }
        // Mark signals as lost if not seen recently
        for (const [id, signal] of this.detectedSignals) {
            if (now.getTime() - signal.lastDetected.getTime() > 5000) {
                if (signal.active) {
                    signal.active = false;
                    this.emit('signal:lost', id);
                }
            }
        }
    }
    estimateBandwidth(frequency) {
        // Simple bandwidth estimation based on frequency
        const source = this.simulatedSources.find(s => Math.abs(s.frequency - frequency) < s.bandwidth);
        return source?.bandwidth || 25000;
    }
    checkForAnomalies(powerLevels) {
        if (!this.baselineSpectrum) {
            this.baselineSpectrum = [...powerLevels];
            return;
        }
        // Check for significant deviations from baseline
        for (let i = 0; i < powerLevels.length; i++) {
            const deviation = powerLevels[i] - this.baselineSpectrum[i];
            if (deviation > 20) {
                const frequency = this.config.startFrequency + i * this.config.resolution;
                this.emit('anomaly:detected', {
                    frequency,
                    type: 'POWER_INCREASE',
                    severity: deviation > 30 ? 'HIGH' : 'MEDIUM'
                });
            }
        }
        // Update baseline with exponential moving average
        for (let i = 0; i < powerLevels.length; i++) {
            this.baselineSpectrum[i] = 0.95 * this.baselineSpectrum[i] + 0.05 * powerLevels[i];
        }
    }
    addSimulatedSource(source) {
        this.simulatedSources.push({ ...source, active: true });
    }
    removeSimulatedSource(frequency) {
        this.simulatedSources = this.simulatedSources.filter(s => Math.abs(s.frequency - frequency) > s.bandwidth);
    }
    getDetectedSignals() {
        return Array.from(this.detectedSignals.values());
    }
    getActiveSignals() {
        return Array.from(this.detectedSignals.values()).filter(s => s.active);
    }
    formatFreq(hz) {
        if (hz >= 1e9)
            return `${(hz / 1e9).toFixed(2)} GHz`;
        if (hz >= 1e6)
            return `${(hz / 1e6).toFixed(2)} MHz`;
        if (hz >= 1e3)
            return `${(hz / 1e3).toFixed(2)} kHz`;
        return `${hz} Hz`;
    }
    isRunning() {
        return this.running;
    }
}
exports.SpectrumMonitor = SpectrumMonitor;
//# sourceMappingURL=SpectrumMonitor.js.map