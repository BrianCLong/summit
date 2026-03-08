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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const FlagGuard_1 = require("../FlagGuard");
const AuthContext = __importStar(require("@/contexts/AuthContext"));
const RbacHooks = __importStar(require("@/hooks/useRbac"));
// Mocking the hooks
vitest_1.vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@/hooks/useRbac', () => ({
    useRbacMultiple: vitest_1.vi.fn(),
}));
// Mock DisabledOverlay to simplify test
vitest_1.vi.mock('../DisabledOverlay', () => ({
    DisabledOverlay: ({ children }) => <div data-testid="disabled-overlay">{children}</div>
}));
(0, vitest_1.describe)('FlagGuard', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.test)('renders children when user has all permissions', () => {
        AuthContext.useAuth.mockReturnValue({ user: { id: '1' }, loading: false })(RbacHooks.useRbacMultiple).mockReturnValue({ hasAllPermissions: true, loading: false });
        (0, react_1.render)(<FlagGuard_1.FlagGuard required={[{ resource: 'test', action: 'read' }]}>
        <div data-testid="child">Child Content</div>
      </FlagGuard_1.FlagGuard>);
        (0, vitest_1.expect)(react_1.screen.getByTestId('child')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByTestId('disabled-overlay')).not.toBeInTheDocument();
    });
    (0, vitest_1.test)('renders DisabledOverlay when user misses permissions and no fallback', () => {
        AuthContext.useAuth.mockReturnValue({ user: { id: '1' }, loading: false })(RbacHooks.useRbacMultiple).mockReturnValue({ hasAllPermissions: false, loading: false });
        (0, react_1.render)(<FlagGuard_1.FlagGuard required={[{ resource: 'test', action: 'read' }]}>
        <div data-testid="child">Child Content</div>
      </FlagGuard_1.FlagGuard>);
        (0, vitest_1.expect)(react_1.screen.getByTestId('disabled-overlay')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByTestId('child')).toBeInTheDocument(); // It wraps children
    });
    (0, vitest_1.test)('renders fallback when user misses permissions and fallback provided', () => {
        AuthContext.useAuth.mockReturnValue({ user: { id: '1' }, loading: false })(RbacHooks.useRbacMultiple).mockReturnValue({ hasAllPermissions: false, loading: false });
        (0, react_1.render)(<FlagGuard_1.FlagGuard required={[{ resource: 'test', action: 'read' }]} fallback={<div data-testid="fallback">Fallback</div>}>
        <div data-testid="child">Child Content</div>
      </FlagGuard_1.FlagGuard>);
        (0, vitest_1.expect)(react_1.screen.getByTestId('fallback')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByTestId('child')).not.toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByTestId('disabled-overlay')).not.toBeInTheDocument();
    });
});
