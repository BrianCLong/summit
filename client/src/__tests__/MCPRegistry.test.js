"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const react_router_dom_1 = require("react-router-dom");
const MCPRegistry_1 = __importDefault(require("../pages/MCPRegistry"));
describe('MCPRegistry page', () => {
    const origFetch = global.fetch;
    beforeEach(() => {
        global.fetch = jest.fn(async (input) => {
            if (typeof input === 'string' &&
                input.endsWith('/api/maestro/v1/mcp/servers')) {
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new Response('Not Found', { status: 404 });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
    });
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        global.fetch = origFetch;
    });
    it('renders registry heading and empty state', async () => {
        (0, react_2.render)(<react_router_dom_1.MemoryRouter>
        <MCPRegistry_1.default />
      </react_router_dom_1.MemoryRouter>);
        expect(react_2.screen.getByText(/MCP Server Registry/i)).toBeInTheDocument();
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/No servers yet/i)).toBeInTheDocument();
        });
    });
});
