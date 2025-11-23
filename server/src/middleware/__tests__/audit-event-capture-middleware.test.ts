/**
 * Audit Event Capture Middleware Test Suite
 *
 * Tests for:
 * - Apollo plugin integration for GraphQL mutations
 * - Express middleware for audit capture
 * - Event sourcing service integration
 * - Aggregate ID extraction logic
 * - Event type determination
 * - Data classification and retention policies
 * - Error handling (non-blocking)
 * - Mutation exclusion filters
 * - Context extraction from requests
 */

import { jest } from '@jest/globals';
import type { Pool } from 'pg';
import { AuditEventCaptureMiddleware } from '../audit-event-capture-middleware';
import { EventSourcingService, DomainEvent } from '../../services/EventSourcingService.js';

// Mock EventSourcingService
jest.mock('../../services/EventSourcingService.js');

describe('AuditEventCaptureMiddleware', () => {
  let middleware: AuditEventCaptureMiddleware;
  let mockPgPool: jest.Mocked<Pool>;
  let mockEventSourcingService: jest.Mocked<EventSourcingService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PostgreSQL pool
    mockPgPool = {} as any;

    // Mock EventSourcingService
    mockEventSourcingService = {
      appendEvent: jest.fn(),
    } as any;

    // Inject mocked service
    (EventSourcingService as jest.Mock).mockImplementation(() => mockEventSourcingService);

    middleware = new AuditEventCaptureMiddleware(mockPgPool);
  });

  describe('createApolloPlugin', () => {
    it('should create Apollo plugin that processes mutations', async () => {
      const plugin = middleware.createApolloPlugin();

      expect(plugin).toBeDefined();
      expect(plugin.requestDidStart).toBeInstanceOf(Function);
    });

    it('should capture mutation event on successful operation', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [
                  {
                    name: { value: 'input' },
                    value: {
                      kind: 'Variable',
                      name: { value: 'input' },
                    },
                  },
                ],
              },
            ],
          },
        },
        operationName: 'CreateEntity',
        context: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            tenantId: 'tenant-456',
          },
          requestId: 'req-789',
          ipAddress: '192.168.1.1',
        },
        response: {
          data: {
            createEntity: {
              id: 'entity-new-123',
              name: 'Test Entity',
            },
          },
        },
        request: {
          variables: {
            input: {
              name: 'Test Entity',
              type: 'Person',
            },
          },
        },
        errors: undefined,
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: expect.any(String),
          aggregateType: 'entity',
          aggregateId: 'entity-new-123',
          eventData: expect.objectContaining({
            mutationName: 'createEntity',
            success: true,
          }),
          tenantId: 'tenant-456',
          userId: 'user-123',
        }),
      );
    });

    it('should skip non-mutation operations', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'query', // Not a mutation
          selectionSet: { selections: [] },
        },
        operationName: 'GetEntity',
        context: {},
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).not.toHaveBeenCalled();
    });

    it('should skip excluded mutations (login, logout)', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'login' }, // Excluded mutation
                arguments: [],
              },
            ],
          },
        },
        operationName: 'Login',
        context: {
          user: { id: 'user-123' },
        },
        response: {
          data: {
            login: { token: 'jwt-token' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).not.toHaveBeenCalled();
    });

    it('should capture mutation errors', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockError = new Error('Validation failed');

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        operationName: 'CreateEntity',
        context: {
          user: { id: 'user-123', tenantId: 'tenant-456' },
          requestId: 'req-789',
        },
        response: {
          data: null,
        },
        request: { variables: {} },
        errors: [mockError],
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              message: 'Validation failed',
            }),
          }),
        }),
      );
    });

    it('should extract context from GraphQL request', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'updateEntity' },
                arguments: [
                  {
                    name: { value: 'id' },
                    value: { kind: 'StringValue', value: 'entity-123' },
                  },
                ],
              },
            ],
          },
        },
        operationName: 'UpdateEntity',
        context: {
          user: {
            id: 'user-456',
            email: 'admin@example.com',
            tenantId: 'tenant-789',
            roles: ['admin'],
          },
          requestId: 'req-abc',
          sessionId: 'session-xyz',
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0',
          correlationId: 'corr-123',
        },
        response: {
          data: {
            updateEntity: {
              id: 'entity-123',
              name: 'Updated Entity',
            },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          tenantId: 'tenant-789',
          requestId: 'req-abc',
          sessionId: 'session-xyz',
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0',
          correlationId: 'corr-123',
        }),
      );
    });

    it('should not throw error if event capture fails', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      // Simulate event sourcing service failure
      mockEventSourcingService.appendEvent.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        operationName: 'CreateEntity',
        context: {
          user: { id: 'user-123', tenantId: 'tenant-456' },
        },
        response: {
          data: {
            createEntity: { id: 'entity-123' },
          },
        },
        request: { variables: {} },
      };

      // Should not throw
      await expect(
        requestHandlers.willSendResponse(mockRequestContext),
      ).resolves.not.toThrow();

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalled();
    });
  });

  describe('createExpressMiddleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        body: {
          query: 'mutation createEntity { createEntity(input: {}) { id } }',
          operationName: 'CreateEntity',
        },
        user: {
          id: 'user-123',
          tenantId: 'tenant-456',
        },
        headers: {
          'x-tenant-id': 'tenant-456',
          'x-request-id': 'req-789',
          'user-agent': 'Test Client',
        },
        ip: '192.168.1.1',
      };

      mockRes = {
        end: jest.fn(),
      };

      mockNext = jest.fn();
    });

    it('should intercept response for GraphQL mutations', async () => {
      const expressMiddleware = middleware.createExpressMiddleware();

      expressMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.end).not.toBe(undefined);
      expect(typeof mockRes.end).toBe('function');
    });

    it('should restore original res.end method', async () => {
      const expressMiddleware = middleware.createExpressMiddleware();
      const originalEnd = jest.fn();
      mockRes.end = originalEnd;

      expressMiddleware(mockReq, mockRes, mockNext);

      // Call the overridden end
      const responseChunk = JSON.stringify({
        data: { createEntity: { id: 'entity-123' } },
      });
      await mockRes.end(responseChunk);

      // Original end should have been called
      expect(originalEnd).toHaveBeenCalled();
    });

    it('should handle non-JSON responses gracefully', async () => {
      const expressMiddleware = middleware.createExpressMiddleware();

      expressMiddleware(mockReq, mockRes, mockNext);

      const nonJsonChunk = 'Not JSON';

      // Should not throw
      await expect(mockRes.end(nonJsonChunk)).resolves.not.toThrow();
    });

    it('should skip non-mutation requests', async () => {
      mockReq.body.query = 'query getEntity { entity(id: "123") { id } }';

      const expressMiddleware = middleware.createExpressMiddleware();
      const originalEnd = jest.fn();
      mockRes.end = originalEnd;

      expressMiddleware(mockReq, mockRes, mockNext);

      const responseChunk = JSON.stringify({
        data: { entity: { id: '123' } },
      });
      await mockRes.end(responseChunk);

      // Should still call original end
      expect(originalEnd).toHaveBeenCalled();
    });

    it('should extract context from Express request headers', async () => {
      const expressMiddleware = middleware.createExpressMiddleware();

      mockReq.headers = {
        'x-tenant-id': 'tenant-789',
        'x-request-id': 'req-abc',
        'x-session-id': 'session-xyz',
        'x-correlation-id': 'corr-123',
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '10.0.0.1',
      };

      expressMiddleware(mockReq, mockRes, mockNext);

      // Verify middleware was set up
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('aggregate type mapping', () => {
    it('should map createEntity to entity aggregate', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            createEntity: { id: 'entity-123' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'entity',
        }),
      );
    });

    it('should map createCase to case aggregate', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createCase' },
                arguments: [],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            createCase: { id: 'case-123' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'case',
        }),
      );
    });

    it('should map createInvestigation to investigation aggregate', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createInvestigation' },
                arguments: [],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            createInvestigation: { id: 'investigation-123' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'investigation',
        }),
      );
    });

    it('should use "unknown" for unmapped mutations', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'customMutation' }, // Not in the map
                arguments: [],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            customMutation: { id: 'custom-123' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'unknown',
        }),
      );
    });
  });

  describe('aggregate ID extraction', () => {
    it('should extract ID from result for create mutations', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            createEntity: { id: 'entity-new-456' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: 'entity-new-456',
        }),
      );
    });

    it('should extract ID from arguments for update/delete mutations', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'updateEntity' },
                arguments: [
                  {
                    name: { value: 'id' },
                    value: { kind: 'StringValue', value: 'entity-789' },
                  },
                ],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            updateEntity: { id: 'entity-789', name: 'Updated' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: expect.any(String),
        }),
      );
    });

    it('should not capture event if aggregate ID cannot be extracted', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        context: { user: { id: 'user-123', tenantId: 'tenant-456' } },
        response: {
          data: {
            createEntity: null, // No ID in result
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      // Should not capture event without aggregate ID
      expect(mockEventSourcingService.appendEvent).not.toHaveBeenCalled();
    });
  });

  describe('context handling', () => {
    it('should use fallback values when user context is missing', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        context: {}, // No user context
        response: {
          data: {
            createEntity: { id: 'entity-123' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'system', // Fallback to 'system'
          tenantId: 'unknown', // Fallback to 'unknown'
        }),
      );
    });

    it('should prefer context user over missing user object', async () => {
      const plugin = middleware.createApolloPlugin();
      const requestHandlers = await plugin.requestDidStart();

      const mockRequestContext = {
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: 'Field',
                name: { value: 'createEntity' },
                arguments: [],
              },
            ],
          },
        },
        context: {
          tenantId: 'tenant-from-context',
        },
        response: {
          data: {
            createEntity: { id: 'entity-123' },
          },
        },
        request: { variables: {} },
      };

      await requestHandlers.willSendResponse(mockRequestContext);

      expect(mockEventSourcingService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-from-context',
        }),
      );
    });
  });
});
