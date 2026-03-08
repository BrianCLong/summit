"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const withAuthorization_1 = require("../withAuthorization");
jest.unmock('../withAuthorization');
jest.mock('../../context/AuthContext.jsx', () => ({
    useAuth: jest.fn(),
}));
const { useAuth } = jest.requireMock('../../context/AuthContext.jsx');
describe('withAuthorization', () => {
    beforeEach(() => {
        useAuth.mockReset();
    });
    it('renders wrapped component when authorization passes', () => {
        useAuth.mockReturnValue({
            user: { role: 'ANALYST', tenantId: 'tenant-a' },
            loading: false,
            claims: [{ action: 'graph:read', tenant: 'tenant-a' }],
            canAccess: (action, tenant) => action === 'graph:read' && tenant === 'tenant-a',
            tenantId: 'tenant-a',
        });
        const Guarded = (0, withAuthorization_1.withAuthorization)({ action: 'graph:read' })(() => (<div data-testid="allowed">content</div>));
        (0, react_2.render)(<Guarded />);
        expect(react_2.screen.getByTestId('allowed')).toBeInTheDocument();
    });
    it('blocks rendering when user lacks required claim', () => {
        useAuth.mockReturnValue({
            user: { role: 'DENIED', tenantId: 'tenant-b' },
            loading: false,
            canAccess: () => false,
            tenantId: 'tenant-b',
        });
        const Guarded = (0, withAuthorization_1.withAuthorization)({ action: 'run:read' })(() => (<div data-testid="forbidden">content</div>));
        (0, react_2.render)(<Guarded />);
        expect(react_2.screen.getByLabelText('access-denied')).toBeInTheDocument();
        expect(react_2.screen.queryByTestId('forbidden')).not.toBeInTheDocument();
    });
});
