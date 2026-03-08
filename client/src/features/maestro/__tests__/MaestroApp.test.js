"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
const react_1 = __importDefault(require("react"));
const globals_1 = require("@jest/globals");
const react_router_dom_1 = require("react-router-dom");
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const MaestroApp_1 = require("../../maestro/MaestroApp");
globals_1.jest.mock('react-virtualized', () => {
    return {
        AutoSizer: ({ children }) => children({ width: 900, height: 600 }),
        List: ({ rowCount, rowRenderer }) => (<div data-testid="virtualized-list">
        {Array.from({ length: rowCount }).map((_, index) => rowRenderer({ index, key: `row-${index}`, style: { height: 90 } }))}
      </div>),
    };
});
(0, globals_1.describe)('MaestroApp', () => {
    (0, globals_1.it)('renders dashboard overview with health stats', () => {
        (0, react_2.render)(<react_router_dom_1.MemoryRouter initialEntries={[{ pathname: '/' }]}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/*" element={<MaestroApp_1.MaestroApp />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        expect(react_2.screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Pipelines/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Policy Denials/)).toBeInTheDocument();
    });
    (0, globals_1.it)('filters pipelines with debounced search and updates query string', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<react_router_dom_1.MemoryRouter initialEntries={[{ pathname: '/pipelines' }]}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/*" element={<MaestroApp_1.MaestroApp />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        const input = react_2.screen.getByLabelText(/Search/i);
        await user.clear(input);
        await user.type(input, 'Pipeline 42');
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/Virtualized list of 1 pipelines/i)).toBeInTheDocument();
        });
        expect(react_2.screen.getByText(/Pipeline 42/)).toBeInTheDocument();
    });
    (0, globals_1.it)('prompts for reason before opening artifacts and stores audit entry', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<react_router_dom_1.MemoryRouter initialEntries={[{ pathname: '/runs/run-1' }]}>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/*" element={<MaestroApp_1.MaestroApp />}/>
        </react_router_dom_1.Routes>
      </react_router_dom_1.MemoryRouter>);
        const artifactsTab = react_2.screen.getByRole('button', { name: /Artifacts/i });
        await user.click(artifactsTab);
        const modal = await react_2.screen.findByText(/Reason for access required/i);
        expect(modal).toBeInTheDocument();
        const reasonInput = react_2.screen.getByLabelText(/Reason/i);
        await user.type(reasonInput, 'Investigating artifact integrity');
        await user.click(react_2.screen.getByRole('button', { name: /Continue/i }));
        expect(await react_2.screen.findByText(/Investigating artifact integrity/)).toBeInTheDocument();
        await user.click(react_2.screen.getByRole('link', { name: /Admin/i }));
        expect(await react_2.screen.findByText(/Access reasons/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Investigating artifact integrity/)).toBeInTheDocument();
    });
});
