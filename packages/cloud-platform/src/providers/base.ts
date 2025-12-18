/**
 * Base Cloud Provider
 * Abstract base class for all cloud providers
 */

import { CloudProvider, CloudConfig, CloudResource, CloudMetrics } from '../types.js';

export abstract class BaseCloudProvider {
  protected provider: CloudProvider;
  protected config: CloudConfig;

  constructor(provider: CloudProvider, config: CloudConfig) {
    this.provider = provider;
    this.config = config;
  }

  abstract validateConnection(): Promise<boolean>;
  abstract listResources(type?: string): Promise<CloudResource[]>;
  abstract getMetrics(resourceId: string): Promise<CloudMetrics>;
  abstract provisionResource(type: string, config: any): Promise<CloudResource>;
  abstract deleteResource(resourceId: string): Promise<void>;

  getProvider(): CloudProvider {
    return this.provider;
  }

  getConfig(): CloudConfig {
    return this.config;
  }
}
