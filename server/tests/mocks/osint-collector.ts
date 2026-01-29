import { jest } from '@jest/globals';

export class SimpleFeedCollector {
  config: Record<string, unknown>;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }

  initialize = jest.fn().mockResolvedValue(undefined);
  collect = jest.fn().mockResolvedValue([]);
  shutdown = jest.fn().mockResolvedValue(undefined);
}
