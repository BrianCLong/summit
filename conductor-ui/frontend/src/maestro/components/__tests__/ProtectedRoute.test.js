"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const ProtectedRoute_1 = __importDefault(require("../ProtectedRoute"));
const AuthContext_1 = require("../../contexts/AuthContext");
const react_router_dom_1 = require("react-router-dom");
// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));
// Mock AuthLogin component as it's a dependency
jest.mock('../../pages/AuthLogin', () => () => <div>AuthLogin Component</div>);
const mockUseAuth = AuthContext_1.useAuth;
const TestPage = () => <div>Protected Content</div>;
const Fallback403 = () => <div>403 Forbidden</div>;
describe('ProtectedRoute', () => {
    beforeEach(() => {
        // Reset mock before each test
        mockUseAuth.mockReset();
    });
    it('renders loading state when authentication is in progress', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
            loading: true,
            accessToken: undefined,
            idToken: undefined,
            expiresAt: undefined,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn(),
            hasTenantAccess: jest.fn(),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('Authenticating...')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
    it('renders AuthLogin when not authenticated', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false,
            loading: false,
            accessToken: undefined,
            idToken: undefined,
            expiresAt: undefined,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn(),
            hasTenantAccess: jest.fn(),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('AuthLogin Component')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
    it('renders protected content when authenticated and no roles/tenant required', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: [],
                tenant: 'default',
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn(() => true),
            hasTenantAccess: jest.fn(() => true),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('Protected Content')).toBeInTheDocument();
        expect(react_2.screen.queryByText('AuthLogin Component')).not.toBeInTheDocument();
    });
    it('renders 403 for role-denied access', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: ['viewer'],
                tenant: 'default',
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn((role) => role === 'viewer'), // User only has 'viewer' role
            hasTenantAccess: jest.fn(() => true),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default roles={['admin']}>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('Access Denied')).toBeInTheDocument();
        expect(react_2.screen.getByText(/You don't have the required role\(s\) to access this resource./i)).toBeInTheDocument();
        expect(react_2.screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
    it('renders fallback component for role-denied access if provided', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: ['viewer'],
                tenant: 'default',
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn((role) => role === 'viewer'),
            hasTenantAccess: jest.fn(() => true),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default roles={['admin']} fallback={Fallback403}>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('403 Forbidden')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
    it('renders 403 for tenant-denied access', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: ['viewer'],
                tenant: 'tenantA',
                tenants: ['tenantA'],
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn(() => true),
            hasTenantAccess: jest.fn((t) => t === 'tenantA'), // User only has access to tenantA
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default tenant="tenantB">
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('Tenant Access Required')).toBeInTheDocument();
        expect(react_2.screen.getByText(/You don't have access to tenant/i)).toBeInTheDocument();
        expect(react_2.screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
    it('renders fallback component for tenant-denied access if provided', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: ['viewer'],
                tenant: 'tenantA',
                tenants: ['tenantA'],
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn(() => true),
            hasTenantAccess: jest.fn((t) => t === 'tenantA'),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default tenant="tenantB" fallback={Fallback403}>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('403 Forbidden')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Tenant Access Required')).not.toBeInTheDocument();
    });
    it('renders protected content when authenticated and authorized by role', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: ['admin'],
                tenant: 'default',
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn((role) => role === 'admin'),
            hasTenantAccess: jest.fn(() => true),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default roles={['admin']}>
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('Protected Content')).toBeInTheDocument();
    });
    it('renders protected content when authenticated and authorized by tenant', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: '1',
                email: 'test@example.com',
                roles: ['viewer'],
                tenant: 'tenantB',
                tenants: ['tenantA', 'tenantB'],
            },
            isAuthenticated: true,
            loading: false,
            accessToken: 'abc',
            idToken: 'def',
            expiresAt: Date.now() + 100000,
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
            switchTenant: jest.fn(),
            hasRole: jest.fn(() => true),
            hasTenantAccess: jest.fn((t) => t === 'tenantB'),
        });
        (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <ProtectedRoute_1.default tenant="tenantB">
          <TestPage />
        </ProtectedRoute_1.default>
      </react_router_dom_1.BrowserRouter>);
        expect(react_2.screen.getByText('Protected Content')).toBeInTheDocument();
    });
});
