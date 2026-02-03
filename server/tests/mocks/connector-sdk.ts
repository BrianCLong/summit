import { jest } from '@jest/globals';

export class BaseConnector {
  constructor(config: Record<string, unknown>) {}
  connect = jest.fn().mockResolvedValue(undefined);
  disconnect = jest.fn().mockResolvedValue(undefined);
  healthCheck = jest.fn().mockResolvedValue({ status: 'healthy' });
}

export const createConnector = jest.fn().mockReturnValue(new BaseConnector({}));

export default { BaseConnector, createConnector };
