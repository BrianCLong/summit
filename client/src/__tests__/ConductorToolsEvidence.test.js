"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const react_router_dom_1 = require("react-router-dom");
const ConductorStudio_1 = __importDefault(require("../features/conductor/ConductorStudio"));
describe('Conductor Tools & Evidence panel', () => {
    const origFetch = global.fetch;
    beforeEach(() => {
        global.fetch = jest.fn(async (input) => {
            const url = String(input);
            if (url.includes('/api/maestro/v1/runs/demo-run/mcp/sessions')) {
                return new Response(JSON.stringify([
                    {
                        sid: 's-1',
                        scopes: ['mcp:invoke'],
                        servers: ['graphops'],
                        createdAt: Date.now(),
                    },
                ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (url.includes('/api/maestro/v1/runs/demo-run/mcp/invocations')) {
                return new Response(JSON.stringify([
                    {
                        id: 'a-1',
                        createdAt: new Date().toISOString(),
                        details: { argsHash: 'aa', resultHash: 'bb' },
                    },
                ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
    });
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        global.fetch = origFetch;
    });
    it('renders attached sessions and invocations when tab selected', async () => {
        (0, react_2.render)(<react_router_dom_1.MemoryRouter>
        <ConductorStudio_1.default />
      </react_router_dom_1.MemoryRouter>);
        const tab = react_2.screen.getByRole('tab', { name: /Tools & Evidence/i });
        react_2.fireEvent.click(tab);
        expect(await react_2.screen.findByText(/Attached MCP Sessions/i)).toBeInTheDocument();
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/Tool Invocations/)).toBeInTheDocument();
        });
    });
});
