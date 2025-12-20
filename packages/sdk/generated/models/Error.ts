/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Error = {
    error?: {
        code?: string;
        message?: string;
        details?: Record<string, any>;
    };
    timestamp?: string;
    /**
     * Request trace ID for debugging
     */
    traceId?: string;
    /**
     * Validation errors
     */
    fields?: Array<string>;
};

