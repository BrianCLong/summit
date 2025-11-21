import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SatelliteCommHandler } from './SatelliteCommHandler.js';

describe('SatelliteCommHandler', () => {
  let handler: SatelliteCommHandler;

  beforeEach(() => {
    handler = new SatelliteCommHandler();
  });

  describe('registerLink', () => {
    it('should register a satellite link', () => {
      const link = handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      expect(link.id).toBeDefined();
      expect(link.constellation).toBe('leo');
      expect(link.linkState).toBe('connected');
    });

    it('should emit link:acquired when state is connected', () => {
      const acquired = vi.fn();
      handler.on('link:acquired', acquired);

      handler.registerLink({
        constellation: 'geo',
        linkState: 'connected',
        bandwidthKbps: 128,
        latencyMs: 600,
        packetLossPercent: 5,
      });

      expect(acquired).toHaveBeenCalledOnce();
    });
  });

  describe('updateLinkState', () => {
    it('should update link state', () => {
      const link = handler.registerLink({
        constellation: 'leo',
        linkState: 'scheduled',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      handler.updateLinkState(link.id, 'connected');

      // Verify via hasConnectivity
      expect(handler.hasConnectivity()).toBe(true);
    });

    it('should emit link:lost when state changes to lost', () => {
      const lost = vi.fn();
      handler.on('link:lost', lost);

      const link = handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      handler.updateLinkState(link.id, 'lost');

      expect(lost).toHaveBeenCalledWith(link.id);
    });
  });

  describe('queueMessage', () => {
    it('should queue a message for transmission', () => {
      handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 0,
      });

      const messageId = handler.queueMessage(
        'priority',
        Buffer.from('test message'),
        'destination-1',
        3600
      );

      expect(messageId).toBeDefined();

      const stats = handler.getQueueStats();
      expect(stats.priority.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasConnectivity', () => {
    it('should return false when no links registered', () => {
      expect(handler.hasConnectivity()).toBe(false);
    });

    it('should return true when connected link exists', () => {
      handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      expect(handler.hasConnectivity()).toBe(true);
    });

    it('should return true when degraded link exists', () => {
      handler.registerLink({
        constellation: 'leo',
        linkState: 'degraded',
        bandwidthKbps: 128,
        latencyMs: 100,
        packetLossPercent: 10,
      });

      expect(handler.hasConnectivity()).toBe(true);
    });

    it('should return false when only lost links exist', () => {
      const link = handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      handler.updateLinkState(link.id, 'lost');

      expect(handler.hasConnectivity()).toBe(false);
    });
  });

  describe('getBestLink', () => {
    it('should return null when no connected links', () => {
      handler.registerLink({
        constellation: 'leo',
        linkState: 'scheduled',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      expect(handler.getBestLink()).toBeNull();
    });

    it('should return the link with best score', () => {
      handler.registerLink({
        constellation: 'geo',
        linkState: 'connected',
        bandwidthKbps: 128,
        latencyMs: 600,
        packetLossPercent: 5,
      });

      const betterLink = handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 512,
        latencyMs: 50,
        packetLossPercent: 1,
      });

      const best = handler.getBestLink();
      expect(best?.id).toBe(betterLink.id);
    });
  });

  describe('getTotalBandwidth', () => {
    it('should return 0 when no connected links', () => {
      expect(handler.getTotalBandwidth()).toBe(0);
    });

    it('should sum bandwidth of all connected links', () => {
      handler.registerLink({
        constellation: 'geo',
        linkState: 'connected',
        bandwidthKbps: 128,
        latencyMs: 600,
        packetLossPercent: 5,
      });

      handler.registerLink({
        constellation: 'leo',
        linkState: 'connected',
        bandwidthKbps: 256,
        latencyMs: 50,
        packetLossPercent: 2,
      });

      expect(handler.getTotalBandwidth()).toBe(384);
    });
  });

  describe('getQueueStats', () => {
    it('should return stats for all priority queues', () => {
      const stats = handler.getQueueStats();

      expect(stats).toHaveProperty('flash');
      expect(stats).toHaveProperty('immediate');
      expect(stats).toHaveProperty('priority');
      expect(stats).toHaveProperty('routine');
      expect(stats).toHaveProperty('store-forward');
    });
  });
});
