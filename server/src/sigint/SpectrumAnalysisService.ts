import { Signal } from './types.js';

export class SpectrumAnalysisService {
  private static instance: SpectrumAnalysisService;

  private constructor() {}

  public static getInstance(): SpectrumAnalysisService {
    if (!SpectrumAnalysisService.instance) {
      SpectrumAnalysisService.instance = new SpectrumAnalysisService();
    }
    return SpectrumAnalysisService.instance;
  }

  /**
   * Detects frequency hopping spread spectrum (FHSS) patterns.
   * In simulation, we look for multiple signals from same emitter with changing frequencies.
   */
  public detectFrequencyHopping(signalHistory: Signal[]): { isHopping: boolean; hopRate?: number; pattern?: number[] } {
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
  public analyzeSpreadSpectrum(signal: Signal): { type: 'DSSS' | 'FHSS' | 'THSS' | 'NONE'; chipRate?: number } {
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
  public detectJamming(signals: Signal[]): { isJammed: boolean; jammingType?: 'BARRAGE' | 'SPOT' | 'SWEEP' } {
    // Logic: Look for high power wideband signals overlapping others
    const highPowerSignals = signals.filter(s => s.power > -40); // Arbitrary threshold
    const wideband = highPowerSignals.find(s => s.bandwidth > 20e6);

    if (wideband) {
        return { isJammed: true, jammingType: 'BARRAGE' };
    }

    return { isJammed: false };
  }
}
