/**
 * Agent Client Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentClient } from '../src/lib/agent-client.js';

describe('AgentClient', () => {
  let client: AgentClient;

  beforeEach(() => {
    client = new AgentClient({
      timeout: 5000,
      maxConcurrent: 3,
    });
  });

  describe('spin', () => {
    it('should spin up an investigation agent', async () => {
      const status = await client.spin({
        name: 'test-agent',
        type: 'investigation',
        parameters: { target: 'test' },
      });

      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('name', 'test-agent');
      expect(status).toHaveProperty('type', 'investigation');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('progress');
    });

    it('should complete agent execution', async () => {
      const status = await client.spin({
        name: 'complete-agent',
        type: 'analysis',
        parameters: {},
      });

      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
      expect(status).toHaveProperty('result');
    });

    it('should track agent logs', async () => {
      const status = await client.spin({
        name: 'logged-agent',
        type: 'enrichment',
        parameters: {},
      });

      expect(status.logs).toBeInstanceOf(Array);
      expect(status.logs.length).toBeGreaterThan(0);
      expect(status.logs[0]).toHaveProperty('timestamp');
      expect(status.logs[0]).toHaveProperty('level');
      expect(status.logs[0]).toHaveProperty('message');
    });

    it('should run agent asynchronously', async () => {
      const status = await client.spin(
        {
          name: 'async-agent',
          type: 'report',
          parameters: {},
        },
        { async: true }
      );

      expect(status.status).toBe('pending');
    });
  });

  describe('spinBatch', () => {
    it('should spin up multiple agents sequentially', async () => {
      const configs = [
        { name: 'agent-1', type: 'investigation' as const, parameters: {} },
        { name: 'agent-2', type: 'analysis' as const, parameters: {} },
      ];

      const results = await client.spinBatch(configs, { parallel: false });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === 'completed')).toBe(true);
    });

    it('should spin up multiple agents in parallel', async () => {
      const configs = [
        { name: 'parallel-1', type: 'enrichment' as const, parameters: {} },
        { name: 'parallel-2', type: 'correlation' as const, parameters: {} },
      ];

      const results = await client.spinBatch(configs, {
        parallel: true,
        maxConcurrent: 2,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('getStatus', () => {
    it('should return status for existing agent', async () => {
      const spinResult = await client.spin({
        name: 'status-agent',
        type: 'investigation',
        parameters: {},
      });

      const status = await client.getStatus(spinResult.id);

      expect(status).not.toBeNull();
      expect(status?.id).toBe(spinResult.id);
    });

    it('should return null for non-existent agent', async () => {
      const status = await client.getStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should cancel a pending agent', async () => {
      const spinResult = await client.spin(
        {
          name: 'cancel-agent',
          type: 'investigation',
          parameters: {},
        },
        { async: true }
      );

      const cancelled = await client.cancel(spinResult.id);
      expect(cancelled).toBe(true);

      const status = await client.getStatus(spinResult.id);
      expect(status?.status).toBe('cancelled');
    });

    it('should return false for non-existent agent', async () => {
      const cancelled = await client.cancel('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all agents', async () => {
      await client.spin({ name: 'list-1', type: 'investigation', parameters: {} });
      await client.spin({ name: 'list-2', type: 'analysis', parameters: {} });

      const agents = await client.list();

      expect(agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter agents by type', async () => {
      await client.spin({ name: 'filter-1', type: 'investigation', parameters: {} });
      await client.spin({ name: 'filter-2', type: 'analysis', parameters: {} });

      const agents = await client.list({ type: 'investigation' });

      expect(agents.every((a) => a.type === 'investigation')).toBe(true);
    });
  });
});
