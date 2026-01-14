import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackFunnelMilestone,
  getFunnelProgress,
  type FunnelMilestone,
} from '@/telemetry/metrics';

// Mock fetch globally
global.fetch = vi.fn();

describe('Funnel Telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('trackFunnelMilestone', () => {
    it('stores milestone in localStorage on success', async () => {
      await trackFunnelMilestone(
        {
          milestone: 'data_source_connected',
          route: '/data/sources',
        },
        'success'
      );

      const progress = JSON.parse(
        localStorage.getItem('funnel_progress') || '{}'
      );
      expect(progress.data_source_connected).toBeDefined();
      expect(progress.data_source_connected.completed).toBe(true);
      expect(progress.data_source_connected.route).toBe('/data/sources');
    });

    it('does not store milestone in localStorage on failure', async () => {
      await trackFunnelMilestone(
        {
          milestone: 'data_source_connected',
          route: '/data/sources',
        },
        'failure'
      );

      const progress = JSON.parse(
        localStorage.getItem('funnel_progress') || '{}'
      );
      expect(progress.data_source_connected).toBeUndefined();
    });

    it('dispatches funnel_updated event on success', async () => {
      const eventListener = vi.fn();
      window.addEventListener('funnel_updated', eventListener);

      await trackFunnelMilestone(
        {
          milestone: 'entities_explored',
          route: '/explore',
        },
        'success'
      );

      expect(eventListener).toHaveBeenCalled();
      window.removeEventListener('funnel_updated', eventListener);
    });

    it('sends telemetry to backend endpoint', async () => {
      await trackFunnelMilestone(
        {
          milestone: 'data_ingested',
          route: '/data/sources',
          metadata: { sourceType: 'csv' },
        },
        'success'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/monitoring/telemetry/events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.event).toBe('funnel_milestone');
      expect(body.labels.milestone).toBe('data_ingested');
      expect(body.labels.status).toBe('success');
      expect(body.metadata).toEqual({ sourceType: 'csv' });
    });

    it('includes no sensitive data in telemetry payload', async () => {
      await trackFunnelMilestone(
        {
          milestone: 'data_source_connected',
          route: '/data/sources',
          metadata: {
            connectionType: 'postgres',
            // No passwords, tokens, or secrets should ever be here
          },
        },
        'success'
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const bodyStr = JSON.stringify(body);

      // Check that common secret keywords are not present
      expect(bodyStr.toLowerCase()).not.toContain('password');
      expect(bodyStr.toLowerCase()).not.toContain('token');
      expect(bodyStr.toLowerCase()).not.toContain('secret');
      expect(bodyStr.toLowerCase()).not.toContain('api_key');
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        trackFunnelMilestone(
          {
            milestone: 'relationships_analyzed',
            route: '/explore',
          },
          'success'
        )
      ).resolves.not.toThrow();

      // Should still store in localStorage despite network error
      const progress = JSON.parse(
        localStorage.getItem('funnel_progress') || '{}'
      );
      expect(progress.relationships_analyzed).toBeDefined();
    });

    it('includes required context fields', async () => {
      await trackFunnelMilestone(
        {
          milestone: 'signup_complete',
          route: '/signup',
        },
        'success'
      );

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.context).toBeDefined();
      expect(body.context.sessionId).toBeDefined();
      expect(body.context.deviceId).toBeDefined();
      expect(body.context.url).toBeDefined();
      expect(body.context.route).toBe('/signup');
    });
  });

  describe('getFunnelProgress', () => {
    it('returns empty object when no progress stored', () => {
      const progress = getFunnelProgress();
      expect(progress).toEqual({});
    });

    it('returns stored progress correctly', () => {
      const mockProgress = {
        signup_complete: {
          completed: true,
          timestamp: '2026-01-14T12:00:00Z',
          route: '/signup',
        },
        data_source_connected: {
          completed: true,
          timestamp: '2026-01-14T12:05:00Z',
          route: '/data/sources',
        },
      };

      localStorage.setItem('funnel_progress', JSON.stringify(mockProgress));

      const progress = getFunnelProgress();
      expect(progress).toEqual(mockProgress);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('funnel_progress', 'invalid json{]');

      const progress = getFunnelProgress();
      expect(progress).toEqual({});
    });

    it('returns all milestone types correctly', () => {
      const milestones: FunnelMilestone[] = [
        'signup_complete',
        'data_source_connected',
        'data_ingested',
        'entities_explored',
        'relationships_analyzed',
      ];

      const mockProgress: Record<string, any> = {};
      milestones.forEach((milestone, index) => {
        mockProgress[milestone] = {
          completed: true,
          timestamp: new Date(Date.now() + index * 1000).toISOString(),
          route: '/test',
        };
      });

      localStorage.setItem('funnel_progress', JSON.stringify(mockProgress));

      const progress = getFunnelProgress();
      milestones.forEach((milestone) => {
        expect(progress[milestone]).toBeDefined();
        expect(progress[milestone].completed).toBe(true);
      });
    });
  });
});
