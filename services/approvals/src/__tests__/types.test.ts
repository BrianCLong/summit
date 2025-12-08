import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateApprovalRequestSchema,
  ApprovalDecisionSchema,
  ListRequestsQuerySchema,
  ActorSchema,
  ResourceSchema,
  ApprovalStatus,
} from '../types.js';

describe('Types and Validation', () => {
  describe('ActorSchema', () => {
    it('should validate a valid actor', () => {
      const actor = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['admin', 'analyst'],
        attributes: { department: 'engineering' },
      };
      const result = ActorSchema.safeParse(actor);
      expect(result.success).toBe(true);
    });

    it('should require id', () => {
      const actor = { email: 'test@example.com' };
      const result = ActorSchema.safeParse(actor);
      expect(result.success).toBe(false);
    });

    it('should validate email format', () => {
      const actor = { id: 'user-123', email: 'invalid-email' };
      const result = ActorSchema.safeParse(actor);
      expect(result.success).toBe(false);
    });

    it('should default roles to empty array', () => {
      const actor = { id: 'user-123' };
      const result = ActorSchema.parse(actor);
      expect(result.roles).toEqual([]);
    });
  });

  describe('ResourceSchema', () => {
    it('should validate a valid resource', () => {
      const resource = {
        type: 'deployment',
        id: 'deploy-123',
        name: 'api-service',
        environment: 'production',
      };
      const result = ResourceSchema.safeParse(resource);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toBe('production');
      }
    });

    it('should require type and id', () => {
      const resource = { name: 'test' };
      const result = ResourceSchema.safeParse(resource);
      expect(result.success).toBe(false);
    });

    it('should allow additional properties', () => {
      const resource = {
        type: 'payout',
        id: 'payout-123',
        amount: 50000,
        currency: 'USD',
      };
      const result = ResourceSchema.safeParse(resource);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateApprovalRequestSchema', () => {
    const validRequest = {
      resource: { type: 'deployment', id: 'deploy-123' },
      action: 'deploy',
      requestor: { id: 'user-123', roles: ['developer'] },
    };

    it('should validate a valid request', () => {
      const result = CreateApprovalRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require resource, action, and requestor', () => {
      const invalidRequest = { action: 'deploy' };
      const result = CreateApprovalRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept optional attributes and context', () => {
      const request = {
        ...validRequest,
        attributes: { risk_level: 'high' },
        context: { pipeline_id: 'pipe-123' },
        justification: 'Deploying new feature',
      };
      const result = CreateApprovalRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should validate expires_at as datetime', () => {
      const request = {
        ...validRequest,
        expires_at: '2024-12-31T23:59:59Z',
      };
      const result = CreateApprovalRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('ApprovalDecisionSchema', () => {
    const validDecision = {
      decision: 'approve',
      actor: { id: 'approver-123', roles: ['admin'] },
    };

    it('should validate a valid decision', () => {
      const result = ApprovalDecisionSchema.safeParse(validDecision);
      expect(result.success).toBe(true);
    });

    it('should accept approve or reject', () => {
      expect(
        ApprovalDecisionSchema.safeParse({
          ...validDecision,
          decision: 'approve',
        }).success,
      ).toBe(true);
      expect(
        ApprovalDecisionSchema.safeParse({
          ...validDecision,
          decision: 'reject',
        }).success,
      ).toBe(true);
    });

    it('should reject invalid decision types', () => {
      const result = ApprovalDecisionSchema.safeParse({
        ...validDecision,
        decision: 'maybe',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional reason and conditions', () => {
      const decision = {
        ...validDecision,
        reason: 'Looks good',
        conditions: [{ type: 'time_window', value: '2h' }],
      };
      const result = ApprovalDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });
  });

  describe('ListRequestsQuerySchema', () => {
    it('should parse valid query params', () => {
      const query = {
        status: 'pending',
        limit: '50',
        actor: 'user-123',
      };
      const result = ListRequestsQuerySchema.parse(query);
      expect(result.status).toEqual(['pending']);
      expect(result.limit).toBe(50);
      expect(result.actor).toBe('user-123');
    });

    it('should handle array of statuses', () => {
      const query = { status: ['pending', 'approved'] };
      const result = ListRequestsQuerySchema.parse(query);
      expect(result.status).toEqual(['pending', 'approved']);
    });

    it('should apply default limit', () => {
      const query = {};
      const result = ListRequestsQuerySchema.parse(query);
      expect(result.limit).toBe(20);
    });

    it('should clamp limit to max 100', () => {
      const query = { limit: '500' };
      const result = ListRequestsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('ApprovalStatus', () => {
    it('should accept valid statuses', () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];
      for (const status of validStatuses) {
        expect(ApprovalStatus.safeParse(status).success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      expect(ApprovalStatus.safeParse('unknown').success).toBe(false);
    });
  });
});
