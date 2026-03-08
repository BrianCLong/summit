"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const hooks = __importStar(require("../hooks"));
const ApprovalsExperience_1 = __importDefault(require("../ApprovalsExperience"));
const baseApproval = {
    id: 'ap-123',
    requester_id: 'analyst.ops',
    approver_id: null,
    action: 'quarantine-segment',
    status: 'pending',
    reason: 'Segment needs isolation while we inspect traffic spikes.',
    run_id: 'run-99',
    created_at: '2024-07-01T12:00:00.000Z',
    approvalsRequired: 2,
    approvalsCompleted: 1,
    requiresDualControl: true,
    claims: ['approval:review', 'approval:dual-control'],
    auditTrail: [
        {
            id: 'evt-1',
            kind: 'preflight',
            actor: 'system',
            message: 'Preflight checks completed',
            at: '2024-07-01T11:59:00.000Z',
            status: 'success',
        },
        {
            id: 'evt-2',
            kind: 'approval',
            actor: 'analyst.ops',
            message: 'Approval requested',
            at: '2024-07-01T12:00:00.000Z',
            status: 'info',
        },
        {
            id: 'evt-3',
            kind: 'execution',
            actor: 'orchestrator',
            message: 'Execution pending approvals',
            at: '2024-07-01T12:01:00.000Z',
            status: 'warning',
        },
        {
            id: 'evt-4',
            kind: 'receipt',
            actor: 'audit-ledger',
            message: 'Receipt will be emitted after execution',
            at: '2024-07-01T12:02:00.000Z',
            status: 'info',
        },
    ],
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockResponse = (body, ok = true) => Promise.resolve(new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
}));
const buildFetch = (claims, approvals = [baseApproval]) => jest.fn(async (input, init) => {
    if (typeof input === 'string' && input === '/graphql') {
        const body = JSON.parse(String(init?.body || '{}'));
        const query = body.query || '';
        if (query.includes('Claims')) {
            return mockResponse({ data: { viewer: { claims } } });
        }
        if (query.includes('Approval(')) {
            return mockResponse({ data: { approval: approvals[0] } });
        }
        return mockResponse({ data: { approvals } });
    }
    if (typeof input === 'string' && input.startsWith('/api/approvals/') && input.includes('/approve')) {
        return mockResponse({ status: 'awaiting_second', approvalsCompleted: 1 });
    }
    return mockResponse({ data: approvals });
});
describe('ApprovalsExperience', () => {
    const originalFetch = global.fetch;
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    });
    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });
    it('renders approvals, timeline, and supports dual-control messaging', async () => {
        jest
            .spyOn(hooks, 'submitDecision')
            .mockResolvedValue({ status: 'awaiting_second', approvalsCompleted: 1 });
        global.fetch = buildFetch(['approval:review', 'approval:dual-control']);
        (0, react_2.render)(<ApprovalsExperience_1.default />);
        const rows = await react_2.screen.findAllByRole('button', {
            name: /quarantine-segment/i,
        });
        expect(rows[0]).toBeInTheDocument();
        expect(await react_2.screen.findByText(/Approval requested/i)).toBeInTheDocument();
        await (0, react_1.act)(async () => {
            await user_event_1.default.type(react_2.screen.getByLabelText(/rationale/i), 'Investigated traffic spike - safe to isolate.');
            await user_event_1.default.click(react_2.screen.getByRole('button', { name: /approve/i }));
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/Dual-control enforced: awaiting co-signer/i)).toBeInTheDocument();
        });
    });
    it('guards the view when ABAC claim is missing', async () => {
        jest.spyOn(hooks, 'useAbacClaims').mockReturnValue({
            claims: ['unrelated:claim'],
            loading: false,
            allowed: false,
            error: null,
            refresh: jest.fn().mockResolvedValue(undefined),
        });
        global.fetch = buildFetch(['unrelated:claim'], []);
        (0, react_2.render)(<ApprovalsExperience_1.default />);
        expect(await react_2.screen.findByText(/missing the required ABAC claims/i)).toBeInTheDocument();
    });
});
