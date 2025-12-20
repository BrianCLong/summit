/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ServiceHealth = {
  status?: ServiceHealth.status;
  /**
   * Response time in milliseconds
   */
  responseTime?: number;
  lastCheck?: string;
};
export namespace ServiceHealth {
  export enum status {
    HEALTHY = 'healthy',
    UNHEALTHY = 'unhealthy',
  }
}

