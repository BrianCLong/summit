/**
 * Feature Flag Service Tests
 */

import { FeatureFlagService } from '../FeatureFlagService';
import type { FeatureFlagProvider, FlagContext, FlagEvaluation } from '../types';

// Mock provider
class MockProvider implements FeatureFlagProvider {
  name = 'Mock';
  private flags: Record<string, any> = {};
  private ready = false;

  async initialize(): Promise<void> {
    this.ready = true;
  }

  async close(): Promise<void> {
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  setFlag(key: string, value: any): void {
    this.flags[key] = value;
  }

  async getBooleanFlag(
    key: string,
    defaultValue: boolean,
    context: FlagContext,
  ): Promise<FlagEvaluation<boolean>> {
    return {
      key,
      value: this.flags[key] ?? defaultValue,
      exists: key in this.flags,
      timestamp: Date.now(),
      reason: 'DEFAULT',
    };
  }

  async getStringFlag(
    key: string,
    defaultValue: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<string>> {
    return {
      key,
      value: this.flags[key] ?? defaultValue,
      exists: key in this.flags,
      timestamp: Date.now(),
      reason: 'DEFAULT',
    };
  }

  async getNumberFlag(
    key: string,
    defaultValue: number,
    context: FlagContext,
  ): Promise<FlagEvaluation<number>> {
    return {
      key,
      value: this.flags[key] ?? defaultValue,
      exists: key in this.flags,
      timestamp: Date.now(),
      reason: 'DEFAULT',
    };
  }

  async getJSONFlag<T>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>> {
    return {
      key,
      value: this.flags[key] ?? defaultValue,
      exists: key in this.flags,
      timestamp: Date.now(),
      reason: 'DEFAULT',
    };
  }

  async getAllFlags(context: FlagContext): Promise<Record<string, FlagEvaluation>> {
    const result: Record<string, FlagEvaluation> = {};
    for (const [key, value] of Object.entries(this.flags)) {
      result[key] = {
        key,
        value,
        exists: true,
        timestamp: Date.now(),
        reason: 'DEFAULT',
      };
    }
    return result;
  }

  async getFlagDefinition() {
    return null;
  }

  async listFlags() {
    return [];
  }

  async track() {}
}

describe('FeatureFlagService', () => {
  let provider: MockProvider;
  let service: FeatureFlagService;

  beforeEach(async () => {
    provider = new MockProvider();
    service = new FeatureFlagService({
      provider,
      enableCache: false,
      enableAnalytics: false,
      enableMetrics: false,
    });

    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });
  });

  describe('boolean flags', () => {
    it('should return flag value when exists', async () => {
      provider.setFlag('test-flag', true);
      const value = await service.getBooleanFlag('test-flag', false);
      expect(value).toBe(true);
    });

    it('should return default value when flag does not exist', async () => {
      const value = await service.getBooleanFlag('non-existent', false);
      expect(value).toBe(false);
    });

    it('should work with context', async () => {
      provider.setFlag('user-flag', true);
      const value = await service.getBooleanFlag('user-flag', false, {
        userId: 'user-123',
      });
      expect(value).toBe(true);
    });
  });

  describe('string flags', () => {
    it('should return string flag value', async () => {
      provider.setFlag('theme', 'dark');
      const value = await service.getStringFlag('theme', 'light');
      expect(value).toBe('dark');
    });

    it('should return default string value', async () => {
      const value = await service.getStringFlag('theme', 'light');
      expect(value).toBe('light');
    });
  });

  describe('number flags', () => {
    it('should return number flag value', async () => {
      provider.setFlag('max-items', 100);
      const value = await service.getNumberFlag('max-items', 50);
      expect(value).toBe(100);
    });

    it('should return default number value', async () => {
      const value = await service.getNumberFlag('max-items', 50);
      expect(value).toBe(50);
    });
  });

  describe('JSON flags', () => {
    it('should return JSON flag value', async () => {
      const config = { color: 'blue', size: 'large' };
      provider.setFlag('ui-config', config);
      const value = await service.getJSONFlag('ui-config', {});
      expect(value).toEqual(config);
    });

    it('should return default JSON value', async () => {
      const defaultConfig = { color: 'red', size: 'small' };
      const value = await service.getJSONFlag('ui-config', defaultConfig);
      expect(value).toEqual(defaultConfig);
    });
  });

  describe('evaluation details', () => {
    it('should return detailed evaluation', async () => {
      provider.setFlag('detailed-flag', true);
      const evaluation = await service.getEvaluation('detailed-flag', false);

      expect(evaluation).toMatchObject({
        key: 'detailed-flag',
        value: true,
        exists: true,
        reason: 'DEFAULT',
      });
      expect(evaluation.timestamp).toBeGreaterThan(0);
    });
  });

  describe('all flags', () => {
    it('should return all flags', async () => {
      provider.setFlag('flag1', true);
      provider.setFlag('flag2', 'value');
      provider.setFlag('flag3', 42);

      const allFlags = await service.getAllFlags();

      expect(allFlags).toEqual({
        flag1: true,
        flag2: 'value',
        flag3: 42,
      });
    });
  });

  describe('events', () => {
    it('should emit ready event', (done) => {
      const newProvider = new MockProvider();
      const newService = new FeatureFlagService({ provider: newProvider });

      newService.on('ready', () => {
        expect(newService.isReady()).toBe(true);
        newService.close();
        done();
      });

      newService.initialize();
    });

    it('should emit evaluation event', (done) => {
      provider.setFlag('tracked-flag', true);

      service.on('evaluation', (event) => {
        expect(event.flagKey).toBe('tracked-flag');
        expect(event.value).toBe(true);
        done();
      });

      const analyticsService = new FeatureFlagService({
        provider,
        enableAnalytics: true,
      });

      analyticsService.initialize().then(() => {
        analyticsService.getBooleanFlag('tracked-flag', false);
      });
    });
  });
});
