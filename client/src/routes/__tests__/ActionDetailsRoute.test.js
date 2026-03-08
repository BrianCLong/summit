"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const react_router_dom_1 = require("react-router-dom");
const ActionDetailsRoute_1 = __importDefault(require("../ActionDetailsRoute"));
const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext.jsx', () => ({
    useAuth: () => mockUseAuth(),
}));
describe('ActionDetailsRoute authorization', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockUseAuth.mockReset();
        localStorage.clear();
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    it('shows an access denied view when tenant scope is forbidden', () => {
        mockUseAuth.mockReturnValue({
            user: {
                role: 'ANALYST',
                tenants: ['tenant-a'],
                permissions: ['read_graph'],
            },
            loading: false,
            hasRole: jest.fn(),
            hasPermission: jest.fn(),
        });
        localStorage.setItem('tenantId', 'tenant-b');
        (0, react_2.render)(<react_router_dom_1.MemoryRouter initialEntries={['/actions/secure-action']}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/actions/:actionId" element={<ActionDetailsRoute_1.default />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        expect(react_2.screen.getByRole('alert')).toHaveTextContent('Access denied');
    });
    it('loads action details when tenant and action are permitted', async () => {
        mockUseAuth.mockReturnValue({
            user: {
                role: 'ANALYST',
                tenants: ['tenant-b'],
                permissions: ['read_graph'],
            },
            loading: false,
            hasRole: jest.fn(),
            hasPermission: jest.fn().mockReturnValue(true),
        });
        localStorage.setItem('tenantId', 'tenant-b');
        (0, react_2.render)(<react_router_dom_1.MemoryRouter initialEntries={['/actions/secure-action']}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/actions/:actionId" element={<ActionDetailsRoute_1.default />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        expect(react_2.screen.getByText(/Loading action/i)).toBeInTheDocument();
        await (0, react_2.act)(async () => {
            jest.advanceTimersByTime(1000);
        });
        expect(react_2.screen.getByText(/Action Safety Status/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/No specific threats detected for secure-action in tenant tenant-b/i)).toBeInTheDocument();
    });
});
