import type { AxiosRequestConfig, AxiosResponse } from 'axios';
export interface Run {
    /** Unique ID of the run */
    id: string;
    /** Name of the pipeline executed */
    pipeline: string;
    /** Current status of the run (e.g., Queued, Running, Succeeded, Failed) */
    status: string;
    /** Duration of the run in milliseconds */
    durationMs?: number;
    /** Cost incurred by the run in USD */
    cost?: number;
    /** Timestamp when the run was created */
    createdAt?: string;
    /**
     * OpenTelemetry Trace ID associated with the run
     * @nullable
     */
    traceId?: string | null;
}
export interface CreateRunRequest {
    /** ID of the pipeline to run */
    pipelineId: string;
    /** Estimated cost of the run for budget checks */
    estimatedCost: number;
}
export interface Pipeline {
    /** Unique ID of the pipeline */
    id: string;
    /** Name of the pipeline */
    name: string;
    /** Version of the pipeline */
    version?: string;
    /** Owner of the pipeline */
    owner?: string;
}
export interface Budget {
    /** Tenant ID */
    tenant: string;
    /** Monthly budget in USD */
    monthlyUsd: number;
    /** Current spend for the month in USD */
    currentSpend?: number;
    policy?: BudgetPolicy;
}
/**
 * Type of budget enforcement
 */
export type BudgetPolicyType = (typeof BudgetPolicyType)[keyof typeof BudgetPolicyType];
export declare const BudgetPolicyType: {
    readonly hard: "hard";
    readonly soft: "soft";
};
export interface BudgetPolicy {
    /** Type of budget enforcement */
    type: BudgetPolicyType;
    /** Budget limit in USD */
    limit: number;
    /** Grace percentage for soft caps (0.0 - 1.0) */
    grace?: number;
}
/**
 * Additional metadata related to the alert
 */
export type AlertEventMeta = {
    [key: string]: unknown;
};
export interface AlertEvent {
    /** Unique ID of the alert event */
    id: string;
    /** Type of alert (e.g., billing, supply-chain, slo) */
    type: string;
    /** Severity of the alert (e.g., critical, warning, info) */
    severity: string;
    /** Short summary of the alert */
    title: string;
    /** Detailed description of the alert */
    body?: string;
    /** Timestamp of the alert event in milliseconds (epoch) */
    ts: number;
    /** Additional metadata related to the alert */
    meta?: AlertEventMeta;
}
export type GetTenantBudgetParams = {
    /**
     * Tenant ID
     */
    tenant: string;
};
export declare const getMaestroOrchestrationAPI: () => {
    listRuns: <TData = AxiosResponse<Run[], any>>(options?: AxiosRequestConfig) => Promise<TData>;
    createRun: <TData = AxiosResponse<Run, any>>(createRunRequest: CreateRunRequest, options?: AxiosRequestConfig) => Promise<TData>;
    getRunById: <TData = AxiosResponse<Run, any>>(runId: string, options?: AxiosRequestConfig) => Promise<TData>;
    getDeprecatedRuns: <TData = AxiosResponse<Run[], any>>(options?: AxiosRequestConfig) => Promise<TData>;
    listPipelines: <TData = AxiosResponse<Pipeline[], any>>(options?: AxiosRequestConfig) => Promise<TData>;
    getTenantBudget: <TData = AxiosResponse<Budget, any>>(params: GetTenantBudgetParams, options?: AxiosRequestConfig) => Promise<TData>;
    listAlertEvents: <TData = AxiosResponse<AlertEvent[], any>>(options?: AxiosRequestConfig) => Promise<TData>;
};
export type ListRunsResult = AxiosResponse<Run[]>;
export type CreateRunResult = AxiosResponse<Run>;
export type GetRunByIdResult = AxiosResponse<Run>;
export type GetDeprecatedRunsResult = AxiosResponse<Run[]>;
export type ListPipelinesResult = AxiosResponse<Pipeline[]>;
export type GetTenantBudgetResult = AxiosResponse<Budget>;
export type ListAlertEventsResult = AxiosResponse<AlertEvent[]>;
