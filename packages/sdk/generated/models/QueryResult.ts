/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type QueryResult = {
    data?: Array<Record<string, any>>;
    columns?: Array<string>;
    stats?: {
        nodesCreated?: number;
        nodesDeleted?: number;
        relationshipsCreated?: number;
        relationshipsDeleted?: number;
        /**
         * Execution time in milliseconds
         */
        executionTime?: number;
    };
};

