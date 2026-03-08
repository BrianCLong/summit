"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const types_js_1 = require("../types.js");
(0, vitest_1.describe)('Types and Validation', () => {
    (0, vitest_1.describe)('ActorSchema', () => {
        (0, vitest_1.it)('should validate a valid actor', () => {
            const actor = {
                id: 'user-123',
                email: 'test@example.com',
                roles: ['admin', 'analyst'],
                attributes: { department: 'engineering' },
            };
            const result = types_js_1.ActorSchema.safeParse(actor);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should require id', () => {
            const actor = { email: 'test@example.com' };
            const result = types_js_1.ActorSchema.safeParse(actor);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should validate email format', () => {
            const actor = { id: 'user-123', email: 'invalid-email' };
            const result = types_js_1.ActorSchema.safeParse(actor);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should default roles to empty array', () => {
            const actor = { id: 'user-123' };
            const result = types_js_1.ActorSchema.parse(actor);
            (0, vitest_1.expect)(result.roles).toEqual([]);
        });
    });
    (0, vitest_1.describe)('ResourceSchema', () => {
        (0, vitest_1.it)('should validate a valid resource', () => {
            const resource = {
                type: 'deployment',
                id: 'deploy-123',
                name: 'api-service',
                environment: 'production',
            };
            const result = types_js_1.ResourceSchema.safeParse(resource);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.environment).toBe('production');
            }
        });
        (0, vitest_1.it)('should require type and id', () => {
            const resource = { name: 'test' };
            const result = types_js_1.ResourceSchema.safeParse(resource);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should allow additional properties', () => {
            const resource = {
                type: 'payout',
                id: 'payout-123',
                amount: 50000,
                currency: 'USD',
            };
            const result = types_js_1.ResourceSchema.safeParse(resource);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('CreateApprovalRequestSchema', () => {
        const validRequest = {
            resource: { type: 'deployment', id: 'deploy-123' },
            action: 'deploy',
            requestor: { id: 'user-123', roles: ['developer'] },
        };
        (0, vitest_1.it)('should validate a valid request', () => {
            const result = types_js_1.CreateApprovalRequestSchema.safeParse(validRequest);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should require resource, action, and requestor', () => {
            const invalidRequest = { action: 'deploy' };
            const result = types_js_1.CreateApprovalRequestSchema.safeParse(invalidRequest);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should accept optional attributes and context', () => {
            const request = {
                ...validRequest,
                attributes: { risk_level: 'high' },
                context: { pipeline_id: 'pipe-123' },
                justification: 'Deploying new feature',
            };
            const result = types_js_1.CreateApprovalRequestSchema.safeParse(request);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should validate expires_at as datetime', () => {
            const request = {
                ...validRequest,
                expires_at: '2024-12-31T23:59:59Z',
            };
            const result = types_js_1.CreateApprovalRequestSchema.safeParse(request);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('ApprovalDecisionSchema', () => {
        const validDecision = {
            decision: 'approve',
            actor: { id: 'approver-123', roles: ['admin'] },
        };
        (0, vitest_1.it)('should validate a valid decision', () => {
            const result = types_js_1.ApprovalDecisionSchema.safeParse(validDecision);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should accept approve or reject', () => {
            (0, vitest_1.expect)(types_js_1.ApprovalDecisionSchema.safeParse({
                ...validDecision,
                decision: 'approve',
            }).success).toBe(true);
            (0, vitest_1.expect)(types_js_1.ApprovalDecisionSchema.safeParse({
                ...validDecision,
                decision: 'reject',
            }).success).toBe(true);
        });
        (0, vitest_1.it)('should reject invalid decision types', () => {
            const result = types_js_1.ApprovalDecisionSchema.safeParse({
                ...validDecision,
                decision: 'maybe',
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('should accept optional reason and conditions', () => {
            const decision = {
                ...validDecision,
                reason: 'Looks good',
                conditions: [{ type: 'time_window', value: '2h' }],
            };
            const result = types_js_1.ApprovalDecisionSchema.safeParse(decision);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('ListRequestsQuerySchema', () => {
        (0, vitest_1.it)('should parse valid query params', () => {
            const query = {
                status: 'pending',
                limit: '50',
                actor: 'user-123',
            };
            const result = types_js_1.ListRequestsQuerySchema.parse(query);
            (0, vitest_1.expect)(result.status).toEqual(['pending']);
            (0, vitest_1.expect)(result.limit).toBe(50);
            (0, vitest_1.expect)(result.actor).toBe('user-123');
        });
        (0, vitest_1.it)('should handle array of statuses', () => {
            const query = { status: ['pending', 'approved'] };
            const result = types_js_1.ListRequestsQuerySchema.parse(query);
            (0, vitest_1.expect)(result.status).toEqual(['pending', 'approved']);
        });
        (0, vitest_1.it)('should apply default limit', () => {
            const query = {};
            const result = types_js_1.ListRequestsQuerySchema.parse(query);
            (0, vitest_1.expect)(result.limit).toBe(20);
        });
        (0, vitest_1.it)('should clamp limit to max 100', () => {
            const query = { limit: '500' };
            const result = types_js_1.ListRequestsQuerySchema.safeParse(query);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    (0, vitest_1.describe)('ApprovalStatus', () => {
        (0, vitest_1.it)('should accept valid statuses', () => {
            const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];
            for (const status of validStatuses) {
                (0, vitest_1.expect)(types_js_1.ApprovalStatus.safeParse(status).success).toBe(true);
            }
        });
        (0, vitest_1.it)('should reject invalid status', () => {
            (0, vitest_1.expect)(types_js_1.ApprovalStatus.safeParse('unknown').success).toBe(false);
        });
    });
});
