"use strict";
// @ts-nocheck
/**
 * Strategic Planning Service - Unit Tests
 *
 * Tests for the StrategicPlanningService business logic layer.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const StrategicPlanningService_js_1 = require("./StrategicPlanningService.js");
// Mock dependencies
globals_1.jest.mock('../config/logger.js', () => ({
    default: {
        child: () => ({
            info: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
        }),
    },
}));
globals_1.jest.mock('./cacheService.js', () => ({
    cacheService: {
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        del: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../otel.js', () => ({
    getTracer: () => ({
        startSpan: () => ({
            end: globals_1.jest.fn(),
        }),
    }),
}));
globals_1.jest.mock('../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue(undefined),
    },
}));
(0, globals_1.describe)('StrategicPlanningService', () => {
    let service;
    let mockPool;
    let mockClient;
    const testTenantId = 'tenant-123';
    const testUserId = 'user-456';
    const mockPlanRow = {
        id: 'plan-001',
        tenant_id: testTenantId,
        investigation_id: null,
        name: 'Test Strategic Plan',
        description: 'A test plan for unit testing',
        status: 'DRAFT',
        priority: 'HIGH',
        time_horizon: 'MEDIUM_TERM',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        assumptions: ['Assumption 1'],
        constraints: ['Constraint 1'],
        dependencies: [],
        tags: ['test'],
        metadata: {},
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        approved_by: null,
        approved_at: null,
        version: 1,
    };
    const mockObjectiveRow = {
        id: 'obj-001',
        plan_id: 'plan-001',
        name: 'Test Objective',
        description: 'A test objective',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        target_value: 100,
        current_value: 0,
        unit: 'percent',
        start_date: new Date('2025-01-01'),
        target_date: new Date('2025-06-30'),
        aligned_intelligence_priorities: [],
        success_criteria: ['Criteria 1'],
        dependencies: [],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
    };
    (0, globals_1.beforeEach)(() => {
        // Create mock client
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        // Create mock pool
        mockPool = {
            query: globals_1.jest.fn(),
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
        };
        // Reset mocks
        globals_1.jest.clearAllMocks();
        // Create service instance
        service = new StrategicPlanningService_js_1.StrategicPlanningService(mockPool);
    });
    (0, globals_1.afterEach)(() => {
        service.removeAllListeners();
    });
    (0, globals_1.describe)('Plan CRUD Operations', () => {
        (0, globals_1.describe)('createPlan', () => {
            (0, globals_1.it)('should create a new strategic plan', async () => {
                const input = {
                    tenantId: testTenantId,
                    name: 'New Plan',
                    description: 'Test description',
                    priority: 'HIGH',
                    timeHorizon: 'MEDIUM_TERM',
                    startDate: '2025-01-01',
                    endDate: '2025-12-31',
                };
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock loading relations (empty for new plan)
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // objectives
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // initiatives
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // risks
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // stakeholders
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // resources
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // kpis
                const result = await service.createPlan(input, testUserId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result.id).toBe('plan-001');
                (0, globals_1.expect)(result.name).toBe('Test Strategic Plan');
                (0, globals_1.expect)(mockPool.query).toHaveBeenCalled();
            });
            (0, globals_1.it)('should emit planCreated event', async () => {
                const input = {
                    tenantId: testTenantId,
                    name: 'New Plan',
                    description: 'Test description',
                    priority: 'HIGH',
                    timeHorizon: 'MEDIUM_TERM',
                    startDate: '2025-01-01',
                    endDate: '2025-12-31',
                };
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                const eventPromise = new Promise((resolve) => {
                    service.on('planCreated', resolve);
                });
                await service.createPlan(input, testUserId);
                const event = await eventPromise;
                (0, globals_1.expect)(event.plan.id).toBe('plan-001');
                (0, globals_1.expect)(event.userId).toBe(testUserId);
            });
            (0, globals_1.it)('should throw error for invalid dates', async () => {
                const input = {
                    tenantId: testTenantId,
                    name: 'New Plan',
                    description: 'Test description',
                    priority: 'HIGH',
                    timeHorizon: 'MEDIUM_TERM',
                    startDate: '2025-12-31',
                    endDate: '2025-01-01', // End before start
                };
                await (0, globals_1.expect)(service.createPlan(input, testUserId)).rejects.toThrow('End date must be after start date');
            });
            (0, globals_1.it)('should throw error for empty name', async () => {
                const input = {
                    tenantId: testTenantId,
                    name: '',
                    description: 'Test description',
                    priority: 'HIGH',
                    timeHorizon: 'MEDIUM_TERM',
                    startDate: '2025-01-01',
                    endDate: '2025-12-31',
                };
                await (0, globals_1.expect)(service.createPlan(input, testUserId)).rejects.toThrow('Plan name is required');
            });
        });
        (0, globals_1.describe)('updatePlan', () => {
            (0, globals_1.it)('should update an existing plan', async () => {
                const input = {
                    name: 'Updated Plan Name',
                    priority: 'CRITICAL',
                };
                // Mock findPlanById
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock update
                mockPool.query.mockResolvedValueOnce({
                    rows: [{ ...mockPlanRow, name: 'Updated Plan Name', priority: 'CRITICAL' }],
                    rowCount: 1,
                });
                // Mock cache invalidation (del calls)
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const result = await service.updatePlan('plan-001', input, testUserId, testTenantId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result?.name).toBe('Updated Plan Name');
            });
            (0, globals_1.it)('should validate status transitions', async () => {
                const input = {
                    status: 'COMPLETED', // Invalid transition from DRAFT
                };
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow], // status is DRAFT
                    rowCount: 1,
                });
                await (0, globals_1.expect)(service.updatePlan('plan-001', input, testUserId, testTenantId)).rejects.toThrow('Invalid status transition');
            });
            (0, globals_1.it)('should allow valid status transition DRAFT -> UNDER_REVIEW', async () => {
                const input = {
                    status: 'UNDER_REVIEW',
                };
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                mockPool.query.mockResolvedValueOnce({
                    rows: [{ ...mockPlanRow, status: 'UNDER_REVIEW' }],
                    rowCount: 1,
                });
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const result = await service.updatePlan('plan-001', input, testUserId, testTenantId);
                (0, globals_1.expect)(result?.status).toBe('UNDER_REVIEW');
            });
        });
        (0, globals_1.describe)('deletePlan', () => {
            (0, globals_1.it)('should delete a draft plan', async () => {
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock loading relations
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
                mockClient.query.mockResolvedValueOnce({
                    rows: [{ tenant_id: testTenantId }],
                    rowCount: 1,
                }); // DELETE
                mockClient.query.mockResolvedValueOnce(undefined); // COMMIT
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const result = await service.deletePlan('plan-001', testUserId, testTenantId);
                (0, globals_1.expect)(result).toBe(true);
            });
            (0, globals_1.it)('should not delete an active plan', async () => {
                mockPool.query.mockResolvedValueOnce({
                    rows: [{ ...mockPlanRow, status: 'ACTIVE' }],
                    rowCount: 1,
                });
                // Mock loading relations
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                await (0, globals_1.expect)(service.deletePlan('plan-001', testUserId, testTenantId)).rejects.toThrow('Cannot delete an active or approved plan');
            });
        });
    });
    (0, globals_1.describe)('Objective Operations', () => {
        (0, globals_1.describe)('createObjective', () => {
            (0, globals_1.it)('should create a new objective', async () => {
                const input = {
                    planId: 'plan-001',
                    name: 'New Objective',
                    description: 'Test objective description',
                    priority: 'HIGH',
                    targetValue: 100,
                    unit: 'percent',
                    startDate: '2025-01-01',
                    targetDate: '2025-06-30',
                };
                // Mock plan exists
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock relations loading
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock create objective
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockObjectiveRow],
                    rowCount: 1,
                });
                // Mock activity log
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
                // Mock cache invalidation
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const result = await service.createObjective(input, testUserId, testTenantId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result.id).toBe('obj-001');
                (0, globals_1.expect)(result.name).toBe('Test Objective');
            });
            (0, globals_1.it)('should throw error if plan not found', async () => {
                const input = {
                    planId: 'nonexistent-plan',
                    name: 'New Objective',
                    description: 'Test',
                    priority: 'HIGH',
                    targetValue: 100,
                    unit: 'percent',
                    startDate: '2025-01-01',
                    targetDate: '2025-06-30',
                };
                mockPool.query.mockResolvedValueOnce({
                    rows: [],
                    rowCount: 0,
                });
                await (0, globals_1.expect)(service.createObjective(input, testUserId, testTenantId)).rejects.toThrow('Plan not found');
            });
        });
        (0, globals_1.describe)('updateObjectiveProgress', () => {
            (0, globals_1.it)('should update objective progress and status', async () => {
                // Mock findObjectiveById
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockObjectiveRow],
                    rowCount: 1,
                });
                // Mock milestones
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock key results
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock update
                mockPool.query.mockResolvedValueOnce({
                    rows: [{ ...mockObjectiveRow, current_value: 75, status: 'ON_TRACK' }],
                    rowCount: 1,
                });
                // Mock activity log
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
                const result = await service.updateObjectiveProgress('obj-001', 75, testUserId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result?.currentValue).toBe(75);
            });
            (0, globals_1.it)('should mark objective as COMPLETED when target reached', async () => {
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockObjectiveRow],
                    rowCount: 1,
                });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({
                    rows: [{ ...mockObjectiveRow, current_value: 100, status: 'COMPLETED' }],
                    rowCount: 1,
                });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
                const result = await service.updateObjectiveProgress('obj-001', 100, testUserId);
                (0, globals_1.expect)(result?.status).toBe('COMPLETED');
            });
        });
    });
    (0, globals_1.describe)('Initiative Operations', () => {
        (0, globals_1.describe)('createInitiative', () => {
            (0, globals_1.it)('should create a new initiative', async () => {
                const input = {
                    planId: 'plan-001',
                    objectiveIds: ['obj-001'],
                    name: 'New Initiative',
                    description: 'Test initiative',
                    type: 'ANALYSIS',
                    priority: 'HIGH',
                    startDate: '2025-01-01',
                    endDate: '2025-06-30',
                    budget: 10000,
                };
                const mockInitiativeRow = {
                    id: 'init-001',
                    plan_id: 'plan-001',
                    objective_ids: ['obj-001'],
                    name: 'New Initiative',
                    description: 'Test initiative',
                    type: 'ANALYSIS',
                    status: 'NOT_STARTED',
                    priority: 'HIGH',
                    start_date: new Date('2025-01-01'),
                    end_date: new Date('2025-06-30'),
                    budget: 10000,
                    budget_used: 0,
                    assigned_to: [],
                    risks: [],
                    dependencies: [],
                    created_by: testUserId,
                    created_at: new Date(),
                    updated_at: new Date(),
                };
                // Mock plan exists
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock relations
                for (let i = 0; i < 6; i++) {
                    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                }
                // Mock create initiative
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockInitiativeRow],
                    rowCount: 1,
                });
                // Mock activity log
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
                // Mock cache invalidation
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const result = await service.createInitiative(input, testUserId, testTenantId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result.id).toBe('init-001');
                (0, globals_1.expect)(result.budget).toBe(10000);
            });
        });
    });
    (0, globals_1.describe)('Risk Operations', () => {
        (0, globals_1.describe)('createRisk', () => {
            (0, globals_1.it)('should create a risk with calculated risk level', async () => {
                const input = {
                    planId: 'plan-001',
                    name: 'Test Risk',
                    description: 'A critical risk',
                    category: 'SECURITY',
                    likelihood: 4,
                    impact: 5,
                };
                const mockRiskRow = {
                    id: 'risk-001',
                    plan_id: 'plan-001',
                    name: 'Test Risk',
                    description: 'A critical risk',
                    category: 'SECURITY',
                    likelihood: 4,
                    impact: 5,
                    risk_score: 20,
                    risk_level: 'CRITICAL',
                    status: 'IDENTIFIED',
                    contingency_plans: [],
                    owner: testUserId,
                    identified_at: new Date(),
                    last_assessed_at: new Date(),
                    review_date: new Date(),
                };
                // Mock plan exists
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock relations
                for (let i = 0; i < 6; i++) {
                    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                }
                // Mock create risk
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockRiskRow],
                    rowCount: 1,
                });
                // Mock activity log
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
                // Mock cache invalidation
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const eventPromise = new Promise((resolve) => {
                    service.on('highRiskAlert', resolve);
                });
                const result = await service.createRisk(input, testUserId, testTenantId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result.riskLevel).toBe('CRITICAL');
                (0, globals_1.expect)(result.riskScore).toBe(20);
                // Should emit high risk alert
                const event = await eventPromise;
                (0, globals_1.expect)(event.risk.id).toBe('risk-001');
            });
        });
    });
    (0, globals_1.describe)('Analytics & Progress', () => {
        (0, globals_1.describe)('getPlanProgress', () => {
            (0, globals_1.it)('should calculate plan progress correctly', async () => {
                const planWithRelations = {
                    ...mockPlanRow,
                    objectives: [
                        { ...mockObjectiveRow, current_value: 50, target_value: 100, status: 'IN_PROGRESS', milestones: [], keyResults: [] },
                        { ...mockObjectiveRow, id: 'obj-002', current_value: 100, target_value: 100, status: 'COMPLETED', milestones: [], keyResults: [] },
                    ],
                    initiatives: [
                        { id: 'init-001', status: 'IN_PROGRESS', milestones: [], deliverables: [] },
                    ],
                    risks: [
                        { id: 'risk-001', riskLevel: 'HIGH', status: 'IDENTIFIED' },
                    ],
                    stakeholders: [],
                    resources: [
                        { type: 'BUDGET', allocated: 10000, used: 5000 },
                    ],
                    kpis: [],
                };
                // Mock plan query with all relations
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock objectives
                mockPool.query.mockResolvedValueOnce({
                    rows: planWithRelations.objectives.map((o, i) => ({
                        id: `obj-00${i + 1}`,
                        plan_id: 'plan-001',
                        name: 'Objective',
                        description: 'Test',
                        status: o.status,
                        priority: 'HIGH',
                        target_value: o.target_value,
                        current_value: o.current_value,
                        unit: 'percent',
                        start_date: new Date(),
                        target_date: new Date(),
                        aligned_intelligence_priorities: [],
                        success_criteria: [],
                        dependencies: [],
                        created_by: testUserId,
                        created_at: new Date(),
                        updated_at: new Date(),
                    })),
                    rowCount: 2,
                });
                // Mock milestones for each objective
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock initiatives
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                            id: 'init-001',
                            plan_id: 'plan-001',
                            objective_ids: [],
                            name: 'Initiative',
                            description: 'Test',
                            type: 'ANALYSIS',
                            status: 'IN_PROGRESS',
                            priority: 'HIGH',
                            start_date: new Date(),
                            end_date: new Date(),
                            budget: null,
                            budget_used: null,
                            assigned_to: [],
                            risks: [],
                            dependencies: [],
                            created_by: testUserId,
                            created_at: new Date(),
                            updated_at: new Date(),
                        }],
                    rowCount: 1,
                });
                // Mock milestones and deliverables for initiative
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock risks
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                            id: 'risk-001',
                            plan_id: 'plan-001',
                            name: 'Risk',
                            description: 'Test',
                            category: 'OPERATIONAL',
                            likelihood: 4,
                            impact: 4,
                            risk_score: 16,
                            risk_level: 'HIGH',
                            status: 'IDENTIFIED',
                            contingency_plans: [],
                            owner: testUserId,
                            identified_at: new Date(),
                            last_assessed_at: new Date(),
                            review_date: new Date(),
                        }],
                    rowCount: 1,
                });
                // Mock mitigations
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock stakeholders
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock resources
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                            id: 'res-001',
                            plan_id: 'plan-001',
                            type: 'BUDGET',
                            name: 'Budget',
                            description: 'Test',
                            allocated: 10000,
                            used: 5000,
                            unit: 'USD',
                            start_date: new Date(),
                            end_date: new Date(),
                            status: 'IN_USE',
                        }],
                    rowCount: 1,
                });
                // Mock KPIs
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock cache
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.get.mockResolvedValue(null);
                cacheService.set.mockResolvedValue(undefined);
                const result = await service.getPlanProgress('plan-001', testTenantId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result?.planId).toBe('plan-001');
                (0, globals_1.expect)(result?.objectivesProgress.total).toBe(2);
                (0, globals_1.expect)(result?.objectivesProgress.completed).toBe(1);
                (0, globals_1.expect)(result?.initiativesProgress.inProgress).toBe(1);
                (0, globals_1.expect)(result?.riskSummary.high).toBe(1);
                (0, globals_1.expect)(result?.resourceUtilization.budget.allocated).toBe(10000);
                (0, globals_1.expect)(result?.resourceUtilization.budget.used).toBe(5000);
            });
        });
        (0, globals_1.describe)('getPlanTimeline', () => {
            (0, globals_1.it)('should build timeline with all events', async () => {
                // Similar setup as getPlanProgress
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow],
                    rowCount: 1,
                });
                // Mock empty relations
                for (let i = 0; i < 12; i++) {
                    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                }
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.get.mockResolvedValue(null);
                cacheService.set.mockResolvedValue(undefined);
                const result = await service.getPlanTimeline('plan-001', testTenantId);
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result?.planId).toBe('plan-001');
                (0, globals_1.expect)(result?.events.length).toBeGreaterThanOrEqual(2); // At least start and end
            });
        });
    });
    (0, globals_1.describe)('Plan Approval Workflow', () => {
        (0, globals_1.describe)('approvePlan', () => {
            (0, globals_1.it)('should approve a plan under review with all requirements met', async () => {
                const planUnderReview = {
                    ...mockPlanRow,
                    status: 'UNDER_REVIEW',
                };
                // Mock findPlanById
                mockPool.query.mockResolvedValueOnce({
                    rows: [planUnderReview],
                    rowCount: 1,
                });
                // Mock objectives with milestones
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockObjectiveRow],
                    rowCount: 1,
                });
                // Mock milestones for objective
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                            id: 'ms-001',
                            parent_id: 'obj-001',
                            parent_type: 'objective',
                            name: 'Milestone',
                            description: 'Test',
                            status: 'PENDING',
                            due_date: new Date(),
                            completed_at: null,
                            completed_by: null,
                            deliverables: [],
                            dependencies: [],
                        }],
                    rowCount: 1,
                });
                // Mock key results
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock initiatives
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock risks
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock stakeholders with owner
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                            id: 'sh-001',
                            plan_id: 'plan-001',
                            user_id: testUserId,
                            name: 'Test Owner',
                            role: 'OWNER',
                            responsibilities: [],
                            communication_preferences: { frequency: 'WEEKLY', channels: ['email'] },
                            added_at: new Date(),
                            added_by: testUserId,
                        }],
                    rowCount: 1,
                });
                // Mock resources
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock KPIs
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                            id: 'kpi-001',
                            plan_id: 'plan-001',
                            name: 'Test KPI',
                            description: 'Test',
                            formula: 'test',
                            target_value: 100,
                            current_value: 0,
                            unit: 'percent',
                            frequency: 'MONTHLY',
                            trend: 'STABLE',
                            last_updated: new Date(),
                            history: [],
                        }],
                    rowCount: 1,
                });
                // Mock update
                mockPool.query.mockResolvedValueOnce({
                    rows: [{ ...planUnderReview, status: 'APPROVED', approved_by: testUserId, approved_at: new Date() }],
                    rowCount: 1,
                });
                const { cacheService } = await Promise.resolve().then(() => __importStar(require('./cacheService.js')));
                cacheService.del.mockResolvedValue(undefined);
                const result = await service.approvePlan('plan-001', testUserId, testTenantId);
                (0, globals_1.expect)(result?.status).toBe('APPROVED');
            });
            (0, globals_1.it)('should reject approval if plan has no objectives', async () => {
                const planUnderReview = {
                    ...mockPlanRow,
                    status: 'UNDER_REVIEW',
                };
                // Mock findPlanById with empty objectives
                mockPool.query.mockResolvedValueOnce({
                    rows: [planUnderReview],
                    rowCount: 1,
                });
                // Mock empty objectives
                mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                // Mock other relations
                for (let i = 0; i < 5; i++) {
                    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                }
                await (0, globals_1.expect)(service.approvePlan('plan-001', testUserId, testTenantId)).rejects.toThrow('Plan cannot be approved');
            });
            (0, globals_1.it)('should reject approval if plan is not under review', async () => {
                mockPool.query.mockResolvedValueOnce({
                    rows: [mockPlanRow], // status is DRAFT
                    rowCount: 1,
                });
                // Mock relations
                for (let i = 0; i < 6; i++) {
                    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
                }
                await (0, globals_1.expect)(service.approvePlan('plan-001', testUserId, testTenantId)).rejects.toThrow('Only plans under review can be approved');
            });
        });
    });
});
