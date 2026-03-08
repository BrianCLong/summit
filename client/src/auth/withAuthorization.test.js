"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const withAuthorization_1 = require("./withAuthorization");
const mockUseAuth = jest.fn();
jest.mock('../context/AuthContext.jsx', () => ({
    useAuth: () => mockUseAuth(),
}));
describe('withAuthorization / AuthorizationGate', () => {
    beforeEach(() => {
        mockUseAuth.mockReset();
    });
    it('renders children when the action and tenant are permitted', () => {
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
        (0, react_2.render)(<withAuthorization_1.AuthorizationGate action="actions:read" tenantId="tenant-a">
        <div>allowed-content</div>
      </withAuthorization_1.AuthorizationGate>);
        expect(react_2.screen.getByText('allowed-content')).toBeInTheDocument();
    });
    it('blocks rendering when the tenant scope is not authorized', () => {
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
        (0, react_2.render)(<withAuthorization_1.AuthorizationGate action="actions:read" tenantId="tenant-b"/>);
        expect(react_2.screen.getByRole('alert')).toHaveTextContent('Access denied');
    });
});
describe('useAuthorization helpers', () => {
    beforeEach(() => {
        mockUseAuth.mockReset();
        mockUseAuth.mockReturnValue({
            user: {
                role: 'OPERATOR',
                tenants: ['alpha'],
                permissions: ['actions:read'],
            },
            loading: false,
            hasRole: jest.fn(),
            hasPermission: jest.fn(),
        });
    });
    const FilterProbe = () => {
        const { filterByAccess } = (0, withAuthorization_1.useAuthorization)('alpha');
        const actions = [
            { id: 'a', policy: 'actions:read' },
            { id: 'b', policy: 'actions:write' },
        ];
        const visible = filterByAccess(actions, (action) => ({
            action: action.policy,
            tenantId: 'alpha',
        }));
        return (<div>
        {visible.map((action) => (<span key={action.id}>{action.id}</span>))}
      </div>);
    };
    it('filters out unauthorized actions', () => {
        (0, react_2.render)(<FilterProbe />);
        expect(react_2.screen.getByText('a')).toBeInTheDocument();
        expect(react_2.screen.queryByText('b')).not.toBeInTheDocument();
    });
});
