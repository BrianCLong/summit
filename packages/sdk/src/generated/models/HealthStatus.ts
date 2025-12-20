/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ServiceHealth } from './ServiceHealth';
export type HealthStatus = {
  status?: HealthStatus.status;
  timestamp?: string;
  version?: string;
  services?: {
    database?: ServiceHealth;
    redis?: ServiceHealth;
    neo4j?: ServiceHealth;
  };
};
export namespace HealthStatus {
  export enum status {
    HEALTHY = 'healthy',
    DEGRADED = 'degraded',
    UNHEALTHY = 'unhealthy',
  }
}

