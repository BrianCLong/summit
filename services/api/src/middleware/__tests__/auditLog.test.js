"use strict";
/**
 * Tests for IntelGraph Audit Log Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const auditLog_js_1 = require("../auditLog.js");
describe('auditLog', () => {
    let mockReq;
    beforeEach(() => {
        mockReq = {
            ip: '192.168.1.1',
        };
        // Clear audit events by calling getAuditEvents and discarding
        (0, auditLog_js_1.getAuditEvents)(0);
    });
    describe('auditLog function', () => {
        it('should record audit event with basic information', () => {
            (0, auditLog_js_1.auditLog)(mockReq, 'test.action');
            const events = (0, auditLog_js_1.getAuditEvents)(1);
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                action: 'test.action',
                ip: '192.168.1.1',
            });
            expect(events[0].ts).toBeDefined();
            expect(new Date(events[0].ts)).toBeInstanceOf(Date);
        });
        it('should record audit event with user information', () => {
            mockReq.user = {
                id: 'user-123',
                email: 'test@example.com',
                role: 'analyst',
            };
            (0, auditLog_js_1.auditLog)(mockReq, 'auth.success');
            const events = (0, auditLog_js_1.getAuditEvents)(1);
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
            mockReq.user = {
                id: 'user-123',
                email: 'test@example.com',
            };
            const details = {
                entityId: 'entity-456',
                operation: 'create',
                success: true,
            };
            (0, auditLog_js_1.auditLog)(mockReq, 'entity.created', details);
            const events = (0, auditLog_js_1.getAuditEvents)(1);
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
            (0, auditLog_js_1.auditLog)(mockReq, 'action.one');
            (0, auditLog_js_1.auditLog)(mockReq, 'action.two');
            (0, auditLog_js_1.auditLog)(mockReq, 'action.three');
            const events = (0, auditLog_js_1.getAuditEvents)(10);
            expect(events.length).toBeGreaterThanOrEqual(3);
            // Events should be in reverse chronological order
            expect(events[0].action).toBe('action.three');
            expect(events[1].action).toBe('action.two');
            expect(events[2].action).toBe('action.one');
        });
        it('should handle missing IP address gracefully', () => {
            const reqWithoutIp = {};
            (0, auditLog_js_1.auditLog)(reqWithoutIp, 'test.action');
            const events = (0, auditLog_js_1.getAuditEvents)(1);
            expect(events).toHaveLength(1);
            expect(events[0].action).toBe('test.action');
            expect(events[0].ip).toBeUndefined();
        });
        it('should limit stored events to 1000', () => {
            // Create more than 1000 events
            for (let i = 0; i < 1100; i++) {
                (0, auditLog_js_1.auditLog)(mockReq, `action.${i}`);
            }
            const events = (0, auditLog_js_1.getAuditEvents)(2000);
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
                (0, auditLog_js_1.auditLog)(mockReq, `action.${i}`);
            }
        });
        it('should return default 200 events when no limit specified', () => {
            const events = (0, auditLog_js_1.getAuditEvents)();
            expect(events.length).toBeLessThanOrEqual(200);
        });
        it('should return specified number of events', () => {
            const events = (0, auditLog_js_1.getAuditEvents)(10);
            expect(events).toHaveLength(10);
        });
        it('should return events in reverse chronological order', () => {
            const events = (0, auditLog_js_1.getAuditEvents)(5);
            // Most recent should be first
            expect(events[0].action).toBe('action.49');
            expect(events[1].action).toBe('action.48');
            expect(events[2].action).toBe('action.47');
        });
        it('should return all events when limit exceeds event count', () => {
            const events = (0, auditLog_js_1.getAuditEvents)(1000);
            expect(events.length).toBeLessThanOrEqual(50);
        });
        it('should return empty array when limit is 0', () => {
            const events = (0, auditLog_js_1.getAuditEvents)(0);
            expect(events).toEqual([]);
        });
    });
    describe('Event data structure', () => {
        it('should have valid timestamp format', () => {
            (0, auditLog_js_1.auditLog)(mockReq, 'test.action');
            const events = (0, auditLog_js_1.getAuditEvents)(1);
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
            (0, auditLog_js_1.auditLog)(mockReq, 'complex.action', complexDetails);
            const events = (0, auditLog_js_1.getAuditEvents)(1);
            expect(events[0].details).toEqual(complexDetails);
        });
    });
});
