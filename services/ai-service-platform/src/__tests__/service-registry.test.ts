import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceRegistry } from '../core/service-registry.js';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(async () => {
    registry = new ServiceRegistry();
    await registry.initialize();
  });

  describe('register', () => {
    it('should register a new service', async () => {
      const service = await registry.register({
        name: 'test-service',
        version: '1.0.0',
        description: 'A test service',
        type: 'llm',
        config: {
          maxConcurrency: 10,
          timeoutMs: 30000,
        },
      });

      expect(service.id).toBeDefined();
      expect(service.name).toBe('test-service');
      expect(service.version).toBe('1.0.0');
      expect(service.type).toBe('llm');
    });

    it('should generate unique IDs', async () => {
      const service1 = await registry.register({
        name: 'service-1',
        version: '1.0.0',
        description: 'First service',
        type: 'llm',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      const service2 = await registry.register({
        name: 'service-2',
        version: '1.0.0',
        description: 'Second service',
        type: 'nlp',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      expect(service1.id).not.toBe(service2.id);
    });
  });

  describe('get', () => {
    it('should retrieve a registered service', async () => {
      const registered = await registry.register({
        name: 'test-service',
        version: '1.0.0',
        description: 'Test',
        type: 'vision',
        config: { maxConcurrency: 5, timeoutMs: 60000 },
      });

      const retrieved = await registry.get(registered.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-service');
    });

    it('should return undefined for non-existent service', async () => {
      const result = await registry.get('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all services', async () => {
      await registry.register({
        name: 'service-1',
        version: '1.0.0',
        description: 'First',
        type: 'llm',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      await registry.register({
        name: 'service-2',
        version: '1.0.0',
        description: 'Second',
        type: 'nlp',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      const services = await registry.list();
      expect(services).toHaveLength(2);
    });

    it('should filter by type', async () => {
      await registry.register({
        name: 'llm-service',
        version: '1.0.0',
        description: 'LLM',
        type: 'llm',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      await registry.register({
        name: 'nlp-service',
        version: '1.0.0',
        description: 'NLP',
        type: 'nlp',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      const llmServices = await registry.list({ type: 'llm' });
      expect(llmServices).toHaveLength(1);
      expect(llmServices[0].type).toBe('llm');
    });
  });

  describe('delete', () => {
    it('should delete a service', async () => {
      const service = await registry.register({
        name: 'to-delete',
        version: '1.0.0',
        description: 'Will be deleted',
        type: 'embedding',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      const deleted = await registry.delete(service.id);
      expect(deleted).toBe(true);

      const retrieved = await registry.get(service.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await registry.register({
        name: 'llm-1',
        version: '1.0.0',
        description: 'LLM',
        type: 'llm',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      await registry.register({
        name: 'llm-2',
        version: '1.0.0',
        description: 'LLM 2',
        type: 'llm',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      await registry.register({
        name: 'nlp-1',
        version: '1.0.0',
        description: 'NLP',
        type: 'nlp',
        config: { maxConcurrency: 10, timeoutMs: 30000 },
      });

      const stats = registry.getStats();
      expect(stats.totalServices).toBe(3);
      expect(stats.byType.llm).toBe(2);
      expect(stats.byType.nlp).toBe(1);
    });
  });
});
