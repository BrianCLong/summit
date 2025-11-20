export interface EntityMatch {
    entityId: string;
    similarity: number;
    confidence: number;
}
export interface TrainingResult {
    success: boolean;
    modelVersion: string;
    accuracy: number;
}
export interface PerformanceMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    processingTime: number;
}
export interface FeedbackRecord {
    entity1Id: string;
    entity2Id: string;
    isMatch: boolean;
    confidence: number;
    userId?: string;
    timestamp: Date;
}
export interface BatchStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    results?: any[];
    error?: string;
}
export interface ModelInfo {
    name: string;
    version: string;
    loaded: boolean;
    type: string;
}
export declare class EntityResolutionService {
    private batches;
    private loadedModels;
    initialize(): Promise<void>;
    findDuplicates(entityId: string, limit?: number, threshold?: number): Promise<EntityMatch[]>;
    bulkResolution(entityIds: string[], threshold?: number, maxClusters?: number): Promise<string[][]>;
    trainFromFeedback(positiveExamples: any[], negativeExamples: any[]): Promise<TrainingResult>;
    calculateSimilarity(entity1Id: string, entity2Id: string): Promise<number>;
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    recordFeedback(feedback: FeedbackRecord): Promise<void>;
    getSemanticEmbeddings(texts: string[], modelName?: string): Promise<number[][]>;
    calculateSemanticSimilarity(text1: string, text2: string, modelName?: string): Promise<number>;
    processBatch(batchId: string, entities: any[], config?: any): Promise<void>;
    getBatchStatus(batchId: string): Promise<BatchStatus>;
    getAvailableModels(): Promise<ModelInfo[]>;
    loadModel(modelName: string): Promise<void>;
}
