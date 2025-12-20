/**
 * Signal Collector - Base collection simulation
 * TRAINING/SIMULATION ONLY - No actual collection capabilities
 */
import { EventEmitter } from 'eventemitter3';
import { RawSignal, SignalType, IntelligenceCategory, ClassificationLevel, CollectionTask } from '../types';
export interface CollectorConfig {
    id: string;
    name: string;
    type: 'SDR' | 'NETWORK' | 'SATELLITE' | 'TACTICAL' | 'STRATEGIC' | 'SIMULATION';
    capabilities: {
        frequencyRange?: {
            min: number;
            max: number;
        };
        bandwidthMax?: number;
        signalTypes: SignalType[];
        categories: IntelligenceCategory[];
    };
    location?: {
        latitude: number;
        longitude: number;
        altitude?: number;
    };
    classification: ClassificationLevel;
}
export interface CollectorEvents {
    'signal:received': (signal: RawSignal) => void;
    'signal:processed': (signal: RawSignal) => void;
    'task:started': (task: CollectionTask) => void;
    'task:completed': (task: CollectionTask) => void;
    'error': (error: Error) => void;
    'status:changed': (status: CollectorStatus) => void;
}
export type CollectorStatus = 'OFFLINE' | 'INITIALIZING' | 'READY' | 'COLLECTING' | 'PAUSED' | 'ERROR';
export declare class SignalCollector extends EventEmitter<CollectorEvents> {
    private config;
    private status;
    private activeTasks;
    private collectedSignals;
    private simulationInterval?;
    constructor(config: CollectorConfig);
    initialize(): Promise<void>;
    startCollection(task: CollectionTask): Promise<void>;
    stopCollection(taskId: string): Promise<void>;
    private startSimulation;
    private stopSimulation;
    private generateSimulatedSignal;
    private generateSimulatedLocation;
    private inferCategory;
    private setStatus;
    private delay;
    getStatus(): CollectorStatus;
    getConfig(): CollectorConfig;
    getActiveTasks(): CollectionTask[];
    getCollectedSignals(): RawSignal[];
    shutdown(): Promise<void>;
}
//# sourceMappingURL=SignalCollector.d.ts.map