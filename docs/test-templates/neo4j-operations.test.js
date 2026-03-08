"use strict";
/**
 * Neo4j Graph Operations Test Template
 *
 * This template demonstrates best practices for testing Neo4j graph operations
 * in the Summit/IntelGraph platform.
 *
 * Key Patterns:
 * - Neo4j driver and session mocking
 * - Cypher query validation
 * - Transaction handling
 * - Graph data assertions
 * - Performance testing
 * - Error handling
 *
 * Usage:
 * 1. Copy this template to your graph service test file
 * 2. Replace placeholder names (GraphService, etc.)
 * 3. Adjust mocks based on your service's dependencies
 * 4. Add service-specific test cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphService_1 = require("../services/GraphService");
describe('GraphService - Neo4j Operations', () => {
    let graphService;
    let mockDriver;
    let mockSession;
    let mockResult;
    beforeEach(() => {
        // Setup result mock
        mockResult = {
            records: [],
            summary: {
                counters: {
                    updates: () => ({
                        nodesCreated: 0,
                        nodesDeleted: 0,
                        relationshipsCreated: 0,
                        relationshipsDeleted: 0,
                        propertiesSet: 0,
                    }),
                },
                query: { text: '', parameters: {} },
                queryType: 'r',
            },
        };
        // Setup session mock
        mockSession = {
            run: globals_1.jest.fn().mockResolvedValue(mockResult),
            executeRead: globals_1.jest.fn(),
            executeWrite: globals_1.jest.fn(),
            close: globals_1.jest.fn().mockResolvedValue(undefined),
            lastBookmark: globals_1.jest.fn(),
            beginTransaction: globals_1.jest.fn(),
        };
        // Setup driver mock
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
            close: globals_1.jest.fn().mockResolvedValue(undefined),
            verifyConnectivity: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        graphService = new GraphService_1.GraphService(mockDriver);
    });
    afterEach(async () => {
        globals_1.jest.clearAllMocks();
    });
    // ===========================================
    // NODE OPERATIONS
    // ===========================================
    describe('createNode', () => {
        it('should create node with labels and properties', async () => {
            // Arrange
            const nodeData = {
                labels: ['Person', 'Customer'],
                properties: {
                    id: 'entity-123',
                    name: 'John Doe',
                    email: 'john@example.com',
                    createdAt: new Date('2025-01-01').toISOString(),
                },
            };
            const mockRecord = {
                get: globals_1.jest.fn((key) => {
                    if (key === 'n') {
                        return {
                            identity: { low: 1, high: 0 },
                            labels: nodeData.labels,
                            properties: nodeData.properties,
                        };
                    }
                }),
            };
            mockResult.records = [mockRecord];
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const result = await graphService.createNode(nodeData.labels, nodeData.properties);
            // Assert
            expect(result).toEqual({
                nodeId: 1,
                labels: nodeData.labels,
                properties: nodeData.properties,
            });
            expect(mockDriver.session).toHaveBeenCalledWith({
                database: 'neo4j',
                defaultAccessMode: 'WRITE',
            });
            expect(mockSession.executeWrite).toHaveBeenCalled();
            expect(mockSession.close).toHaveBeenCalled();
        });
        it('should execute correct Cypher query', async () => {
            // Arrange
            const labels = ['Person'];
            const properties = { id: 'entity-123', name: 'John' };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                const mockTx = {
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                };
                return callback(mockTx);
            });
            // Act
            await graphService.createNode(labels, properties);
            // Assert
            const executedCallback = mockSession.executeWrite.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            expect(mockTx.run).toHaveBeenCalledWith(expect.stringMatching(/CREATE \(n:Person\)/), expect.objectContaining({ props: properties }));
        });
        it('should handle multiple labels correctly', async () => {
            // Arrange
            const labels = ['Person', 'Customer', 'VIP'];
            const properties = { id: 'entity-123' };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                const mockTx = {
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                };
                return callback(mockTx);
            });
            // Act
            await graphService.createNode(labels, properties);
            // Assert
            const executedCallback = mockSession.executeWrite.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            expect(mockTx.run).toHaveBeenCalledWith(expect.stringMatching(/CREATE \(n:Person:Customer:VIP\)/), expect.any(Object));
        });
        it('should handle errors gracefully', async () => {
            // Arrange
            mockSession.executeWrite.mockRejectedValue(new Error('Constraint violation'));
            // Act & Assert
            await expect(graphService.createNode(['Person'], { id: 'duplicate' })).rejects.toThrow('Failed to create node');
            expect(mockSession.close).toHaveBeenCalled();
        });
        it('should sanitize properties to prevent injection', async () => {
            // Arrange
            const maliciousProperties = {
                id: 'entity-123',
                name: "'; DROP DATABASE neo4j; --",
            };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                const mockTx = {
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                };
                return callback(mockTx);
            });
            // Act
            await graphService.createNode(['Person'], maliciousProperties);
            // Assert
            const executedCallback = mockSession.executeWrite.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            // Verify parameterized query was used (not string concatenation)
            expect(mockTx.run).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ props: maliciousProperties }));
        });
    });
    describe('updateNode', () => {
        it('should update node properties', async () => {
            // Arrange
            const nodeId = 'entity-123';
            const updates = {
                name: 'Updated Name',
                email: 'updated@example.com',
                updatedAt: new Date().toISOString(),
            };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            await graphService.updateNode(nodeId, updates);
            // Assert
            expect(mockSession.executeWrite).toHaveBeenCalled();
        });
        it('should not remove existing properties not in update', async () => {
            // Arrange
            const nodeId = 'entity-123';
            const updates = { name: 'New Name' };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                const mockTx = {
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                };
                return callback(mockTx);
            });
            // Act
            await graphService.updateNode(nodeId, updates);
            // Assert
            const executedCallback = mockSession.executeWrite.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            // Should use += operator to add/update properties
            expect(mockTx.run).toHaveBeenCalledWith(expect.stringMatching(/n \+= \$props/), expect.any(Object));
        });
        it('should throw error when node not found', async () => {
            // Arrange
            mockResult.records = [];
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act & Assert
            await expect(graphService.updateNode('nonexistent', { name: 'Test' })).rejects.toThrow('Node not found');
        });
    });
    describe('deleteNode', () => {
        it('should delete node by id', async () => {
            // Arrange
            const nodeId = 'entity-123';
            mockResult.summary = {
                counters: {
                    updates: () => ({
                        nodesDeleted: 1,
                        relationshipsDeleted: 0,
                    }),
                },
            };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const result = await graphService.deleteNode(nodeId);
            // Assert
            expect(result).toBe(true);
            expect(mockSession.executeWrite).toHaveBeenCalled();
        });
        it('should delete node and relationships when cascade is true', async () => {
            // Arrange
            const nodeId = 'entity-123';
            mockResult.summary = {
                counters: {
                    updates: () => ({
                        nodesDeleted: 1,
                        relationshipsDeleted: 3,
                    }),
                },
            };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                const mockTx = {
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                };
                return callback(mockTx);
            });
            // Act
            await graphService.deleteNode(nodeId, { cascade: true });
            // Assert
            const executedCallback = mockSession.executeWrite.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            expect(mockTx.run).toHaveBeenCalledWith(expect.stringMatching(/DETACH DELETE n/), expect.any(Object));
        });
        it('should prevent deletion when node has relationships and cascade is false', async () => {
            // Arrange
            const nodeId = 'entity-123';
            // Mock relationship check
            mockSession.executeRead.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue({
                        records: [{ get: () => 3 }], // 3 relationships
                    }),
                });
            });
            // Act & Assert
            await expect(graphService.deleteNode(nodeId, { cascade: false })).rejects.toThrow('Cannot delete node with existing relationships');
        });
    });
    // ===========================================
    // RELATIONSHIP OPERATIONS
    // ===========================================
    describe('createRelationship', () => {
        it('should create relationship between nodes', async () => {
            // Arrange
            const relationshipData = {
                fromId: 'entity-123',
                toId: 'entity-456',
                type: 'KNOWS',
                properties: {
                    since: '2020-01-01',
                    confidence: 0.95,
                },
            };
            const mockRecord = {
                get: globals_1.jest.fn((key) => {
                    if (key === 'r') {
                        return {
                            identity: { low: 1, high: 0 },
                            type: relationshipData.type,
                            properties: relationshipData.properties,
                        };
                    }
                }),
            };
            mockResult.records = [mockRecord];
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const result = await graphService.createRelationship(relationshipData.fromId, relationshipData.toId, relationshipData.type, relationshipData.properties);
            // Assert
            expect(result).toEqual({
                relationshipId: 1,
                type: relationshipData.type,
                properties: relationshipData.properties,
            });
        });
        it('should validate relationship type format', async () => {
            // Arrange
            const invalidType = 'invalid-type'; // Should be UPPERCASE
            // Act & Assert
            await expect(graphService.createRelationship('entity-1', 'entity-2', invalidType, {})).rejects.toThrow('Relationship type must be uppercase');
        });
        it('should throw error when source node does not exist', async () => {
            // Arrange
            mockResult.records = [];
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act & Assert
            await expect(graphService.createRelationship('nonexistent', 'entity-2', 'KNOWS', {})).rejects.toThrow('Source or target node not found');
        });
        it('should prevent duplicate relationships', async () => {
            // Arrange
            // Mock existing relationship check
            mockSession.executeRead.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue({
                        records: [{ get: () => ({ identity: { low: 1 } }) }],
                    }),
                });
            });
            // Act & Assert
            await expect(graphService.createRelationship('entity-1', 'entity-2', 'KNOWS', {})).rejects.toThrow('Relationship already exists');
        });
    });
    // ===========================================
    // QUERY OPERATIONS
    // ===========================================
    describe('runQuery', () => {
        it('should execute read query', async () => {
            // Arrange
            const query = 'MATCH (n:Person) WHERE n.id = $id RETURN n';
            const params = { id: 'entity-123' };
            const mockRecord = {
                get: globals_1.jest.fn(() => ({
                    labels: ['Person'],
                    properties: { id: 'entity-123', name: 'John' },
                })),
                toObject: globals_1.jest.fn(() => ({
                    n: {
                        labels: ['Person'],
                        properties: { id: 'entity-123', name: 'John' },
                    },
                })),
            };
            mockResult.records = [mockRecord];
            mockSession.executeRead.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const result = await graphService.runQuery(query, params, 'READ');
            // Assert
            expect(result).toHaveLength(1);
            expect(mockSession.executeRead).toHaveBeenCalled();
        });
        it('should execute write query', async () => {
            // Arrange
            const query = 'CREATE (n:Person {id: $id}) RETURN n';
            const params = { id: 'entity-new' };
            mockSession.executeWrite.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            await graphService.runQuery(query, params, 'WRITE');
            // Assert
            expect(mockSession.executeWrite).toHaveBeenCalled();
        });
        it('should enforce query timeout', async () => {
            // Arrange
            const query = 'MATCH (n) RETURN n'; // Potentially expensive query
            mockSession.executeRead.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 100)));
            // Act & Assert
            await expect(graphService.runQuery(query, {}, 'READ', { timeout: 50 })).rejects.toThrow('Query timeout');
        });
        it('should prevent Cypher injection', async () => {
            // Arrange
            const maliciousInput = "'; MATCH (n) DETACH DELETE n; //";
            // Act
            await graphService.runQuery('MATCH (n:Person {name: $name}) RETURN n', { name: maliciousInput }, 'READ');
            // Assert - should use parameterized query
            const executedCallback = mockSession.executeRead.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            expect(mockTx.run).toHaveBeenCalledWith(expect.stringMatching(/\$name/), expect.objectContaining({ name: maliciousInput }));
        });
    });
    // ===========================================
    // GRAPH ANALYTICS
    // ===========================================
    describe('calculatePageRank', () => {
        it('should calculate PageRank for investigation', async () => {
            // Arrange
            const investigationId = 'inv-123';
            const mockRecords = [
                {
                    get: globals_1.jest.fn((key) => {
                        if (key === 'nodeId')
                            return 'entity-1';
                        if (key === 'score')
                            return 0.45;
                    }),
                },
                {
                    get: globals_1.jest.fn((key) => {
                        if (key === 'nodeId')
                            return 'entity-2';
                        if (key === 'score')
                            return 0.30;
                    }),
                },
            ];
            mockResult.records = mockRecords;
            mockSession.executeRead.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const result = await graphService.calculatePageRank(investigationId);
            // Assert
            expect(result).toEqual([
                { nodeId: 'entity-1', score: 0.45 },
                { nodeId: 'entity-2', score: 0.30 },
            ]);
        });
        it('should use correct PageRank algorithm parameters', async () => {
            // Arrange
            const investigationId = 'inv-123';
            const options = {
                iterations: 20,
                dampingFactor: 0.85,
            };
            mockSession.executeRead.mockImplementation(async (callback) => {
                const mockTx = {
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                };
                return callback(mockTx);
            });
            // Act
            await graphService.calculatePageRank(investigationId, options);
            // Assert
            const executedCallback = mockSession.executeRead.mock.calls[0][0];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
            };
            await executedCallback(mockTx);
            expect(mockTx.run).toHaveBeenCalledWith(expect.stringMatching(/gds\.pageRank/), expect.objectContaining({
                iterations: 20,
                dampingFactor: 0.85,
            }));
        });
    });
    // ===========================================
    // TRANSACTION HANDLING
    // ===========================================
    describe('transaction', () => {
        it('should execute multiple operations in transaction', async () => {
            // Arrange
            const operations = [
                { query: 'CREATE (n:Person {id: $id1})', params: { id1: 'entity-1' } },
                { query: 'CREATE (n:Person {id: $id2})', params: { id2: 'entity-2' } },
                {
                    query: 'MATCH (a {id: $id1}), (b {id: $id2}) CREATE (a)-[:KNOWS]->(b)',
                    params: { id1: 'entity-1', id2: 'entity-2' },
                },
            ];
            const mockTx = {
                run: globals_1.jest.fn().mockResolvedValue(mockResult),
                commit: globals_1.jest.fn().mockResolvedValue(undefined),
                rollback: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            mockSession.beginTransaction.mockReturnValue(mockTx);
            // Act
            await graphService.transaction(operations);
            // Assert
            expect(mockTx.run).toHaveBeenCalledTimes(3);
            expect(mockTx.commit).toHaveBeenCalled();
            expect(mockTx.rollback).not.toHaveBeenCalled();
        });
        it('should rollback transaction on error', async () => {
            // Arrange
            const operations = [
                { query: 'CREATE (n:Person {id: $id})', params: { id: 'entity-1' } },
                { query: 'INVALID QUERY', params: {} }, // This will fail
            ];
            const mockTx = {
                run: globals_1.jest
                    .fn()
                    .mockResolvedValueOnce(mockResult)
                    .mockRejectedValueOnce(new Error('Syntax error')),
                commit: globals_1.jest.fn(),
                rollback: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            mockSession.beginTransaction.mockReturnValue(mockTx);
            // Act & Assert
            await expect(graphService.transaction(operations)).rejects.toThrow('Transaction failed');
            expect(mockTx.rollback).toHaveBeenCalled();
            expect(mockTx.commit).not.toHaveBeenCalled();
        });
    });
    // ===========================================
    // PERFORMANCE TESTS
    // ===========================================
    describe('performance', () => {
        it('should complete query within performance budget', async () => {
            // Arrange
            const query = 'MATCH (n:Person) RETURN n LIMIT 1000';
            mockSession.executeRead.mockImplementation(async (callback) => {
                // Simulate fast query
                await new Promise((resolve) => setTimeout(resolve, 50));
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const start = Date.now();
            await graphService.runQuery(query, {}, 'READ');
            const duration = Date.now() - start;
            // Assert
            expect(duration).toBeLessThan(500); // Budget: 500ms
        });
        it('should handle large result sets efficiently', async () => {
            // Arrange
            const largeResultSet = Array.from({ length: 10000 }, (_, i) => ({
                get: globals_1.jest.fn(() => ({ id: `entity-${i}` })),
            }));
            mockResult.records = largeResultSet;
            mockSession.executeRead.mockImplementation(async (callback) => {
                return callback({
                    run: globals_1.jest.fn().mockResolvedValue(mockResult),
                });
            });
            // Act
            const start = Date.now();
            const result = await graphService.runQuery('MATCH (n) RETURN n', {}, 'READ');
            const duration = Date.now() - start;
            // Assert
            expect(result).toHaveLength(10000);
            expect(duration).toBeLessThan(1000); // Should process 10k records in < 1s
        });
    });
});
