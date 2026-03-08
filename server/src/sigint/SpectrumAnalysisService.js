"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectrumAnalysisService = void 0;
class SpectrumAnalysisService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SpectrumAnalysisService.instance) {
            SpectrumAnalysisService.instance = new SpectrumAnalysisService();
        }
        return SpectrumAnalysisService.instance;
    }
    /**
     * Detects frequency hopping spread spectrum (FHSS) patterns.
     * In simulation, we look for multiple signals from same emitter with changing frequencies.
     */
    detectFrequencyHopping(signalHistory) {
        if (signalHistory.length < 5) {
            return { isHopping: false };
        }
        // Check for rapid frequency changes with consistent power/bandwidth
        // This is a naive simulation logic
        const uniqueFreqs = new Set(signalHistory.map(s => s.frequency));
        if (uniqueFreqs.size > signalHistory.length * 0.8) {
            return {
                isHopping: true,
                hopRate: 100 + Math.random() * 900, // hops/sec
                pattern: Array.from(uniqueFreqs).slice(0, 10)
            };
        }
        return { isHopping: false };
    }
    /**
     * Analyzes spread spectrum characteristics.
     */
    analyzeSpreadSpectrum(signal) {
        if (signal.bandwidth > 10e6 && signal.snr < 10) {
            // Wide bandwidth + Low SNR characteristic of DSSS
            return {
                type: 'DSSS',
                chipRate: signal.bandwidth / 2
            };
        }
        // Default to None or check for hopping externally
        return { type: 'NONE' };
    }
    /**
     * Detects jamming or interference.
     */
    detectJamming(signals) {
        // Logic: Look for high power wideband signals overlapping others
        const highPowerSignals = signals.filter(s => s.power > -40); // Arbitrary threshold
        const wideband = highPowerSignals.find(s => s.bandwidth > 20e6);
        if (wideband) {
            return { isJammed: true, jammingType: 'BARRAGE' };
        }
        return { isJammed: false };
    }
}
exports.SpectrumAnalysisService = SpectrumAnalysisService;
