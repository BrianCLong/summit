/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ServiceHealth } from './ServiceHealth';
export type HealthStatus = {
    status?: 'healthy' | 'degraded' | 'unhealthy';
    /**
     * Service uptime in seconds
     */
    uptime?: number;
    timestamp?: string;
    version?: string;
    services?: {
        database?: ServiceHealth;
        redis?: ServiceHealth;
        neo4j?: ServiceHealth;
    };
};

