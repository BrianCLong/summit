import { InspectEnv, RecursionBudget, SpanRef } from '../api';
export declare class RCRSession {
    private budget;
    private env;
    private trace;
    private metrics;
    private startTime;
    constructor(env: InspectEnv, budget: RecursionBudget);
    listFiles(prefix?: string): Promise<string[]>;
    readFile(path: string, start?: number, end?: number): Promise<{
        text: string;
        span: SpanRef;
    }>;
    searchText(pattern: string, opts?: {
        paths?: string[];
        maxHits?: number;
    }): Promise<Array<{
        hit: string;
        span: SpanRef;
    }>>;
    private checkBudget;
    private recordTrace;
    getTrace(): any[];
    getMetrics(): Record<string, number>;
}
