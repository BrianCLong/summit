/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HealthStatus } from '../models/HealthStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SystemService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Health check
   * System health status
   * @returns HealthStatus System is healthy
   * @throws ApiError
   */
  public getHealth(): CancelablePromise<HealthStatus> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/health',
    });
  }
  /**
   * System metrics
   * Prometheus-compatible metrics endpoint
   * @returns string Metrics data
   * @throws ApiError
   */
  public getMetrics(): CancelablePromise<string> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/metrics',
    });
  }
}
