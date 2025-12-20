/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalysisResult = {
    analysisType?: string;
    results?: Record<string, any>;
    insights?: Array<{
        type?: string;
        confidence?: number;
        description?: string;
    }>;
    executionTime?: number;
    createdAt?: string;
};

