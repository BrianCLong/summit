/**
 * Tests for IntelGraph Audit Log Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request } from 'express';
import { auditLog, getAuditEvents } from '../auditLog.js';

describe('auditLog', () => {
  let mockReq: Partial<Request>;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
    };

    // Clear audit events by calling getAuditEvents and discarding
    getAuditEvents(0);
  });

  describe('auditLog function', () => {
    it('should record audit event with basic information', () => {
      auditLog(mockReq as Request, 'test.action');

      const events = getAuditEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        action: 'test.action',
        ip: '192.168.1.1',
      });
      expect(events[0].ts).toBeDefined();
      expect(new Date(events[0].ts)).toBeInstanceOf(Date);
    });

    it('should record audit event with user information', () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'analyst',
      };

      auditLog(mockReq as Request, 'auth.success');

      const events = getAuditEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        action: 'auth.success',
        ip: '192.168.1.1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'analyst',
        },
      });
    });

    it('should record audit event with additional details', () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const details = {
        entityId: 'entity-456',
        operation: 'create',
        success: true,
      };

      auditLog(mockReq as Request, 'entity.created', details);

      const events = getAuditEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        action: 'entity.created',
        ip: '192.168.1.1',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        details,
      });
    });

    it('should handle multiple audit events', () => {
      auditLog(mockReq as Request, 'action.one');
      auditLog(mockReq as Request, 'action.two');
      auditLog(mockReq as Request, 'action.three');

      const events = getAuditEvents(10);
      expect(events.length).toBeGreaterThanOrEqual(3);

      // Events should be in reverse chronological order
      expect(events[0].action).toBe('action.three');
      expect(events[1].action).toBe('action.two');
      expect(events[2].action).toBe('action.one');
    });

    it('should handle missing IP address gracefully', () => {
      const reqWithoutIp = {} as Request;

      auditLog(reqWithoutIp, 'test.action');

      const events = getAuditEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('test.action');
      expect(events[0].ip).toBeUndefined();
    });

    it('should limit stored events to 1000', () => {
      // Create more than 1000 events
      for (let i = 0; i < 1100; i++) {
        auditLog(mockReq as Request, `action.${i}`);
      }

      const events = getAuditEvents(2000);

      // Should only keep the last 1000
      expect(events.length).toBeLessThanOrEqual(1000);

      // The oldest events should have been removed
      const firstAction = events[events.length - 1].action;
      expect(firstAction).not.toBe('action.0');
    });
  });

  describe('getAuditEvents function', () => {
    beforeEach(() => {
      // Add some test events
      for (let i = 0; i < 50; i++) {
        auditLog(mockReq as Request, `action.${i}`);
      }
    });

    it('should return default 200 events when no limit specified', () => {
      const events = getAuditEvents();
      expect(events.length).toBeLessThanOrEqual(200);
    });

    it('should return specified number of events', () => {
      const events = getAuditEvents(10);
      expect(events).toHaveLength(10);
    });

    it('should return events in reverse chronological order', () => {
      const events = getAuditEvents(5);

      // Most recent should be first
      expect(events[0].action).toBe('action.49');
      expect(events[1].action).toBe('action.48');
      expect(events[2].action).toBe('action.47');
    });

    it('should return all events when limit exceeds event count', () => {
      const events = getAuditEvents(1000);
      expect(events.length).toBeLessThanOrEqual(50);
    });

    it('should return empty array when limit is 0', () => {
      const events = getAuditEvents(0);
      expect(events).toEqual([]);
    });
  });

  describe('Event data structure', () => {
    it('should have valid timestamp format', () => {
      auditLog(mockReq as Request, 'test.action');

      const events = getAuditEvents(1);
      const timestamp = new Date(events[0].ts);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(Math.abs(Date.now() - timestamp.getTime())).toBeLessThan(1000);
    });

    it('should preserve complex detail objects', () => {
      const complexDetails = {
        nested: {
          level1: {
            level2: {
              value: 'deep',
            },
          },
        },
        array: [1, 2, 3],
        boolean: true,
        number: 42,
        null: null,
      };

      auditLog(mockReq as Request, 'complex.action', complexDetails);

      const events = getAuditEvents(1);
      expect(events[0].details).toEqual(complexDetails);
    });
  });
});
