/**
 * Maestro Orchestration Engine
 * Core DAG execution engine with retry, compensation, and state persistence
 */
import { EventEmitter } from 'events';
export interface WorkflowStep {
    id: string;
    name: string;
    plugin: string;
    config: Record<string, any>;
    depends_on?: string[];
    retry?: {
        max_attempts: number;
        backoff_ms: number;
        exponential: boolean;
    };
    timeout_ms?: number;
    compensation?: {
        plugin: string;
        config: Record<string, any>;
    };
}
export interface WorkflowDefinition {
    name: string;
    version: string;
    steps: WorkflowStep[];
    global_timeout_ms?: number;
    on_failure?: 'stop' | 'continue' | 'compensate';
}
export interface RunContext {
    run_id: string;
    workflow: WorkflowDefinition;
    tenant_id: string;
    triggered_by: string;
    environment: string;
    parameters: Record<string, any>;
    budget?: {
        max_cost_usd?: number;
        max_duration_ms?: number;
    };
}
export interface StepExecution {
    step_id: string;
    run_id: string;
    status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    attempt: number;
    started_at?: Date;
    completed_at?: Date;
    output?: any;
    error?: string;
    cost_usd?: number;
    metadata: Record<string, any>;
}
export interface StepPlugin {
    name: string;
    validate(config: any): void;
    execute(context: RunContext, step: WorkflowStep, execution: StepExecution): Promise<{
        output?: any;
        cost_usd?: number;
        metadata?: Record<string, any>;
    }>;
    compensate?(context: RunContext, step: WorkflowStep, execution: StepExecution): Promise<void>;
}
export declare class MaestroEngine extends EventEmitter {
    private stateStore;
    private artifactStore;
    private policyEngine;
    private plugins;
    private activeRuns;
    constructor(stateStore: StateStore, artifactStore: ArtifactStore, policyEngine: PolicyEngine);
    registerPlugin(plugin: StepPlugin): void;
    startRun(context: RunContext): Promise<string>;
    private executeWorkflow;
    private executeStepWithRetry;
    private executeCompensation;
    private topologicalSort;
    private validateWorkflow;
    private areDepenciesSatisfied;
    private completeRun;
    private handleRunFailure;
    cancelRun(runId: string): Promise<void>;
    getRunStatus(runId: string): Promise<any>;
}
export interface StateStore {
    createRun(context: RunContext): Promise<void>;
    updateRunStatus(runId: string, status: string, error?: string): Promise<void>;
    getRunStatus(runId: string): Promise<string>;
    getRunDetails(runId: string): Promise<any>;
    createStepExecution(execution: StepExecution): Promise<void>;
    updateStepExecution(execution: StepExecution): Promise<void>;
    getStepExecution(runId: string, stepId: string): Promise<StepExecution | null>;
}
export interface ArtifactStore {
    store(runId: string, stepId: string, name: string, data: Buffer): Promise<string>;
    retrieve(runId: string, stepId: string, name: string): Promise<Buffer>;
    list(runId: string): Promise<string[]>;
}
export interface PolicyEngine {
    check(action: string, subject: string, attributes: Record<string, any>): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
}
