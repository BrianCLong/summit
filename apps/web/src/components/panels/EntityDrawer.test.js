"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const EntityDrawer_1 = require("./EntityDrawer");
const vitest_1 = require("vitest");
const Tooltip_1 = require("@/components/ui/Tooltip");
// Mock dependencies
vitest_1.vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'test-user', tenantId: 'test-tenant' } }),
}));
// Mock fetch for comments
global.fetch = vitest_1.vi.fn();
(0, vitest_1.describe)('EntityDrawer', () => {
    const mockEntity = {
        id: '123',
        type: 'PERSON',
        name: 'John Doe',
        confidence: 0.9,
        properties: { location: 'New York' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        tags: ['vip'],
    };
    const defaultProps = {
        data: [mockEntity],
        open: true,
        onOpenChange: vitest_1.vi.fn(),
        selectedEntityId: '123',
        relationships: [],
    };
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [],
        });
    });
    (0, vitest_1.it)('renders action buttons with accessible labels', () => {
        (0, react_1.render)(<Tooltip_1.TooltipProvider>
        <EntityDrawer_1.EntityDrawer {...defaultProps}/>
      </Tooltip_1.TooltipProvider>);
        // These tests are EXPECTED TO FAIL initially until we add aria-labels
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Edit entity/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Delete entity/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Export entity/i })).toBeInTheDocument();
    });
});
