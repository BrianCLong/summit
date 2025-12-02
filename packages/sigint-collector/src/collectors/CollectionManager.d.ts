/**
 * Collection Manager - Orchestrates multiple collectors
 * TRAINING/SIMULATION ONLY
 */
import { EventEmitter } from 'eventemitter3';
import { SignalCollector, CollectorConfig } from './SignalCollector';
import { RawSignal, CollectionTask, SignalType, IntelligenceCategory } from '../types';
export interface CollectionManagerConfig {
    maxConcurrentTasks: number;
    signalRetentionHours: number;
    autoMinimization: boolean;
    complianceMode: 'TRAINING' | 'EXERCISE' | 'DEMONSTRATION';
}
export interface CollectionStats {
    totalSignals: number;
    signalsByType: Record<string, number>;
    signalsByCategory: Record<string, number>;
    activeCollectors: number;
    activeTasks: number;
}
export interface CollectionManagerEvents {
    'collector:added': (collector: SignalCollector) => void;
    'collector:removed': (collectorId: string) => void;
    'signal:collected': (signal: RawSignal) => void;
    'signal:processed': (signal: RawSignal) => void;
    'task:created': (task: CollectionTask) => void;
    'task:assigned': (task: CollectionTask, collectorId: string) => void;
    'compliance:violation': (message: string) => void;
    'error': (error: Error) => void;
}
export declare class CollectionManager extends EventEmitter<CollectionManagerEvents> {
    private config;
    private collectors;
    private tasks;
    private signals;
    private complianceLog;
    constructor(config?: Partial<CollectionManagerConfig>);
    addCollector(config: CollectorConfig): Promise<SignalCollector>;
    removeCollector(collectorId: string): Promise<void>;
    createTask(params: {
        name: string;
        description?: string;
        targetFrequencies: Array<{
            center: number;
            bandwidth: number;
            priority: number;
        }>;
        targetSignalTypes?: SignalType[];
        targetLocations?: Array<{
            latitude: number;
            longitude: number;
            radius: number;
        }>;
        legalAuthority: string;
        durationHours: number;
        minimizationRequired?: boolean;
    }): Promise<CollectionTask>;
    assignTask(taskId: string, collectorId: string): Promise<void>;
    private handleSignal;
    private applyMinimization;
    private cleanOldSignals;
    private logCompliance;
    getStats(): CollectionStats;
    getCollectors(): SignalCollector[];
    getTasks(): CollectionTask[];
    getSignals(filter?: {
        signalType?: SignalType;
        category?: IntelligenceCategory;
        since?: Date;
    }): RawSignal[];
    getComplianceLog(): typeof this.complianceLog;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=CollectionManager.d.ts.map