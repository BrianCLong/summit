"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_router_dom_1 = require("react-router-dom");
const react_2 = require("@testing-library/react");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const DemoModeGate_1 = require("@/components/common/DemoModeGate");
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.unstubAllEnvs();
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.describe)('demo mode gating', () => {
    (0, vitest_1.it)('prevents access to demo routes when the flag is disabled', () => {
        vitest_1.vi.stubEnv('VITE_DEMO_MODE', 'false');
        (0, react_2.render)(<react_router_dom_1.MemoryRouter initialEntries={[{ pathname: '/demo' }]}> 
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<div>home</div>}/>
          <react_router_dom_1.Route path="/demo" element={<DemoModeGate_1.DemoModeGate>
                <div>demo control</div>
              </DemoModeGate_1.DemoModeGate>}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        (0, vitest_1.expect)(react_2.screen.getByText('home')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.queryByText('demo control')).not.toBeInTheDocument();
    });
    (0, vitest_1.it)('shows the demo banner when the flag is enabled', () => {
        vitest_1.vi.stubEnv('VITE_DEMO_MODE', 'true');
        (0, react_2.render)(<DemoIndicator_1.DemoIndicator />);
        (0, vitest_1.expect)(react_2.screen.getByText(/demo mode/i)).toBeInTheDocument();
    });
});
