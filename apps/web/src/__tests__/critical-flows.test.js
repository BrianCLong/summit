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
const react_1 = require("@testing-library/react");
const react_router_dom_1 = require("react-router-dom");
const vitest_1 = require("vitest");
const DemoModeGate_1 = require("../components/common/DemoModeGate");
const demoModeLib = __importStar(require("../lib/demoMode"));
// Mock the demo mode hook
vitest_1.vi.mock('../lib/demoMode', () => ({
    isDemoModeEnabled: vitest_1.vi.fn(),
    useDemoMode: vitest_1.vi.fn(),
}));
describe('Critical Flows - Demo Gating', () => {
    it('should render children when demo mode is enabled', () => {
        // @ts-ignore
        demoModeLib.isDemoModeEnabled.mockReturnValue(true);
        // @ts-ignore
        demoModeLib.useDemoMode.mockReturnValue(true);
        (0, react_1.render)(<react_router_dom_1.MemoryRouter initialEntries={['/demo']}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/demo" element={<DemoModeGate_1.DemoModeGate>
                <div>Demo Content</div>
              </DemoModeGate_1.DemoModeGate>}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        expect(react_1.screen.getByText('Demo Content')).toBeInTheDocument();
    });
    it('should redirect or not render when demo mode is disabled', () => {
        // @ts-ignore
        demoModeLib.isDemoModeEnabled.mockReturnValue(false);
        // @ts-ignore
        demoModeLib.useDemoMode.mockReturnValue(false);
        (0, react_1.render)(<react_router_dom_1.MemoryRouter initialEntries={['/demo']}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/demo" element={<DemoModeGate_1.DemoModeGate>
                <div>Demo Content</div>
              </DemoModeGate_1.DemoModeGate>}/>
          <react_router_dom_1.Route path="/" element={<div>Home</div>}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        // DemoModeGate usually redirects or returns null.
        // Assuming implementation details:
        expect(react_1.screen.queryByText('Demo Content')).not.toBeInTheDocument();
    });
});
