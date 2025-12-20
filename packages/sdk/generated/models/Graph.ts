/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphSummary } from './GraphSummary';
export type Graph = (GraphSummary & {
    configuration?: {
        layout?: 'force-directed' | 'hierarchical' | 'circular';
        theme?: 'light' | 'dark' | 'high-contrast';
        autoSave?: boolean;
    };
    statistics?: {
        density?: number;
        clusteringCoefficient?: number;
        averageDegree?: number;
    };
});

