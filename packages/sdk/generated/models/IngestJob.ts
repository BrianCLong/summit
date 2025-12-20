/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IngestJob = {
    id: string;
    connector: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
};

