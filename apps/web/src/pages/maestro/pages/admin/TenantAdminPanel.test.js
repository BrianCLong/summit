"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const TenantAdminPanel_1 = __importDefault(require("./TenantAdminPanel"));
vitest_1.vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ token: 'test-token' }),
}));
const createJsonResponse = (data) => Promise.resolve({
    ok: true,
    json: async () => data,
});
describe('TenantAdminPanel', () => {
    beforeEach(() => {
        vitest_1.vi.restoreAllMocks();
    });
    it('renders tenant admin sections after loading', async () => {
        const fetchSpy = vitest_1.vi
            .spyOn(global, 'fetch')
            .mockImplementation((input) => {
            const url = typeof input === 'string' ? input : input.url;
            if (url === '/api/tenants') {
                return createJsonResponse({
                    success: true,
                    data: [{ id: 't1', name: 'Acme', slug: 'acme' }],
                    receipt: {
                        id: 'r1',
                        action: 'TENANT_LIST_VIEWED',
                        tenantId: 't1',
                        actorId: 'user-1',
                        issuedAt: '2025-01-01T00:00:00Z',
                        hash: 'hash',
                    },
                });
            }
            if (url === '/api/tenants/t1') {
                return createJsonResponse({
                    success: true,
                    data: {
                        id: 't1',
                        name: 'Acme',
                        slug: 'acme',
                        settings: { policy_profile: 'baseline' },
                    },
                });
            }
            if (url === '/api/policy-profiles') {
                return createJsonResponse({
                    success: true,
                    data: [
                        {
                            id: 'baseline',
                            name: 'Baseline',
                            description: 'Baseline',
                            guardrails: { requirePurpose: false, requireJustification: false },
                        },
                    ],
                });
            }
            return createJsonResponse({ success: true, data: [] });
        });
        (0, react_2.render)(<TenantAdminPanel_1.default />);
        expect(await react_2.screen.findByText('Create tenant (Switchboard)')).toBeInTheDocument();
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Tenant configuration')).toBeInTheDocument();
            expect(react_2.screen.getByText('Policy profile')).toBeInTheDocument();
        });
        fetchSpy.mockRestore();
    });
});
