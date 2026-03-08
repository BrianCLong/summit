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
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const matchers = __importStar(require("vitest-axe/matchers"));
const vitest_axe_1 = require("vitest-axe");
require("vitest-axe/extend-expect");
const react_router_dom_1 = require("react-router-dom");
const Navigation_1 = require("../src/components/Navigation");
const Layout_1 = require("../src/components/Layout");
const Tooltip_1 = require("../src/components/ui/Tooltip");
vitest_1.expect.extend(matchers);
// Mock Auth Context
const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    permissions: ['*'],
    tenantId: 'tenant-1'
};
vitest_1.vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: true,
        loading: false,
        logout: vitest_1.vi.fn(),
    }),
}));
vitest_1.vi.mock('@/contexts/SearchContext', () => ({
    useSearch: () => ({
        openSearch: vitest_1.vi.fn(),
    }),
}));
vitest_1.vi.mock('@/hooks/useRbac', () => ({
    useRbac: () => ({
        hasPermission: true,
    }),
}));
(0, vitest_1.describe)('Accessibility Checks', () => {
    (0, vitest_1.it)('Navigation should have no accessibility violations', async () => {
        const { container } = (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <Tooltip_1.TooltipProvider>
          <Navigation_1.Navigation user={mockUser}/>
        </Tooltip_1.TooltipProvider>
      </react_router_dom_1.BrowserRouter>);
        const results = await (0, vitest_axe_1.axe)(container);
        (0, vitest_1.expect)(results).toHaveNoViolations();
    });
    (0, vitest_1.it)('Layout structure should have no accessibility violations', async () => {
        const { container } = (0, react_2.render)(<react_router_dom_1.BrowserRouter>
        <Tooltip_1.TooltipProvider>
          <Layout_1.Layout />
        </Tooltip_1.TooltipProvider>
      </react_router_dom_1.BrowserRouter>);
        const results = await (0, vitest_axe_1.axe)(container);
        (0, vitest_1.expect)(results).toHaveNoViolations();
    });
});
