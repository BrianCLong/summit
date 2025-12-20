/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Suggestion = {
    id: string;
    type: 'link' | 'anomaly';
    data: Record<string, any>;
    status: 'new' | 'approved' | 'rejected' | 'materialized';
    score?: number;
};

