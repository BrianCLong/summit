"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../config/logger.js', () => ({
    __esModule: true,
    default: {
        child: () => ({
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
            trace: globals_1.jest.fn(),
        }),
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        trace: globals_1.jest.fn(),
    },
}));
const CaseWorkflowService_js_1 = require("../cases/workflow/CaseWorkflowService.js");
describe('Case dashboard read model integration (flagged)', () => {
    const baseCaseRow = {
        id: 'case-1',
        tenant_id: 'tenant-1',
        title: 'Example Case',
        description: null,
        status: 'open',
        compartment: null,
        policy_labels: [],
        metadata: {},
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
        created_by: 'user-1',
        closed_at: null,
        closed_by: null,
    };
    const metricsRow = {
        case_id: 'case-1',
        tenant_id: 'tenant-1',
        participant_count: 3,
        open_task_count: 5,
        breached_sla_count: 1,
        at_risk_sla_count: 2,
        pending_approval_count: 4,
        last_task_due_at: new Date('2024-01-05T00:00:00Z'),
        refreshed_at: new Date('2024-01-02T12:00:00Z'),
    };
    const createMockPool = () => {
        const query = globals_1.jest.fn(async (sql, _params) => {
            if (sql.includes('FROM maestro.cases')) {
                return { rows: [baseCaseRow] };
            }
            if (sql.includes('FROM maestro.case_dashboard_read_models')) {
                return { rows: [metricsRow] };
            }
            if (sql.includes('refresh_case_dashboard_read_model')) {
                return { rows: [] };
            }
            throw new Error(`Unhandled query in test: ${sql}`);
        });
        return { query };
    };
    beforeEach(() => {
        process.env.READ_MODELS_V1 = '1';
    });
    afterEach(() => {
        delete process.env.READ_MODELS_V1;
    });
    it('returns base case data when read-model metrics are unavailable', async () => {
        const workflowService = new CaseWorkflowService_js_1.CaseWorkflowService(createMockPool());
        const results = await workflowService.listCases({
            tenantId: 'tenant-1',
            status: 'open',
            limit: 10,
            offset: 0,
        });
        expect(results).toHaveLength(1);
        const metrics = results[0].dashboardMetrics;
        expect(metrics).toBeUndefined();
    });
    it('returns base case detail when read-model metrics are unavailable', async () => {
        const workflowService = new CaseWorkflowService_js_1.CaseWorkflowService(createMockPool());
        const result = await workflowService.getCase('case-1', 'tenant-1', {
            includeParticipants: false,
        });
        const metrics = result?.dashboardMetrics;
        expect(metrics).toBeUndefined();
    });
});
