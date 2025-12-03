/**
 * Spectrum Monitor - RF spectrum analysis simulation
 * TRAINING/SIMULATION ONLY
 */
import { EventEmitter } from 'eventemitter3';
import { SpectrumData, EmitterProfile, ModulationType } from '../types';
export interface SpectrumMonitorConfig {
    startFrequency: number;
    endFrequency: number;
    resolution: number;
    sweepRate: number;
    sensitivity: number;
}
export interface DetectedSignal {
    id: string;
    frequency: number;
    bandwidth: number;
    power: number;
    snr: number;
    modulation?: ModulationType;
    firstDetected: Date;
    lastDetected: Date;
    active: boolean;
}
export interface SpectrumMonitorEvents {
    'sweep:complete': (data: SpectrumData) => void;
    'signal:detected': (signal: DetectedSignal) => void;
    'signal:lost': (signalId: string) => void;
    'emitter:identified': (emitter: EmitterProfile) => void;
    'anomaly:detected': (anomaly: {
        frequency: number;
        type: string;
        severity: string;
    }) => void;
}
export declare class SpectrumMonitor extends EventEmitter<SpectrumMonitorEvents> {
    private config;
    private running;
    private sweepInterval?;
    private detectedSignals;
    private emitterProfiles;
    private baselineSpectrum?;
    private sweepCount;
    private simulatedSources;
    constructor(config: SpectrumMonitorConfig);
    private initializeSimulatedSources;
    start(): void;
    stop(): void;
    private performSweep;
    private detectPeaks;
    private updateSignalDetections;
    private estimateBandwidth;
    private checkForAnomalies;
    addSimulatedSource(source: {
        frequency: number;
        bandwidth: number;
        power: number;
        modulation: ModulationType;
    }): void;
    removeSimulatedSource(frequency: number): void;
    getDetectedSignals(): DetectedSignal[];
    getActiveSignals(): DetectedSignal[];
    private formatFreq;
    isRunning(): boolean;
}
//# sourceMappingURL=SpectrumMonitor.d.ts.map