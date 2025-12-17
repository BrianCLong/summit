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
import { EventEmitter } from 'eventemitter3';
import { RawSignal, SignalType } from '../types';
export interface DataSourceConfig {
    id: string;
    name: string;
    type: DataSourceType;
    connectionString?: string;
    authorization: AuthorizationInfo;
    options?: Record<string, unknown>;
}
export type DataSourceType = 'SIMULATION' | 'FILE' | 'TRAINING_FEED' | 'DEFENSIVE' | 'EXERCISE' | 'REPLAY';
export interface AuthorizationInfo {
    authority: string;
    reference: string;
    validFrom: Date;
    validTo: Date;
    restrictions: string[];
    authorizedBy: string;
    verificationMethod: 'MANUAL' | 'TOKEN' | 'CERTIFICATE';
}
export interface DataSourceEvents {
    'data:received': (data: RawSignal) => void;
    'connected': () => void;
    'disconnected': () => void;
    'error': (error: Error) => void;
    'authorization:expired': () => void;
}
export declare abstract class DataSourceAdapter extends EventEmitter<DataSourceEvents> {
    protected config: DataSourceConfig;
    protected connected: boolean;
    protected authorizationValid: boolean;
    constructor(config: DataSourceConfig);
    /**
     * Validate authorization before any data access
     */
    protected validateAuthorization(): boolean;
    /**
     * Connect to data source
     */
    abstract connect(): Promise<void>;
    /**
     * Disconnect from data source
     */
    abstract disconnect(): Promise<void>;
    /**
     * Start receiving data
     */
    abstract startReceiving(): Promise<void>;
    /**
     * Stop receiving data
     */
    abstract stopReceiving(): Promise<void>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get configuration
     */
    getConfig(): DataSourceConfig;
}
/**
 * File-based data source for pre-recorded authorized data
 */
export declare class FileDataSource extends DataSourceAdapter {
    private filePath?;
    private fileReader?;
    constructor(config: DataSourceConfig & {
        filePath: string;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    startReceiving(): Promise<void>;
    stopReceiving(): Promise<void>;
    private generateFromFile;
}
/**
 * Training feed data source for real-time training data
 */
export declare class TrainingFeedSource extends DataSourceAdapter {
    private feedInterval?;
    private signalTypes;
    private rate;
    constructor(config: DataSourceConfig & {
        signalTypes?: SignalType[];
        rate?: number;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    startReceiving(): Promise<void>;
    stopReceiving(): Promise<void>;
    private generateTrainingSignal;
}
/**
 * Exercise data source for sanctioned exercises
 */
export declare class ExerciseDataSource extends DataSourceAdapter {
    private exerciseId;
    private scenarioData;
    private playbackIndex;
    private playbackInterval?;
    constructor(config: DataSourceConfig & {
        exerciseId: string;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    startReceiving(): Promise<void>;
    stopReceiving(): Promise<void>;
    private loadExerciseScenario;
    getExerciseId(): string;
    getProgress(): {
        current: number;
        total: number;
    };
}
/**
 * Factory for creating data source adapters
 */
export declare class DataSourceFactory {
    static create(config: DataSourceConfig): DataSourceAdapter;
    static createTrainingSource(name: string): DataSourceAdapter;
}
//# sourceMappingURL=DataSourceAdapter.d.ts.map