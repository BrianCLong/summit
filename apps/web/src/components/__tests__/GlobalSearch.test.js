"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const GlobalSearch_1 = require("../GlobalSearch");
const react_router_dom_1 = require("react-router-dom");
const vitest_1 = require("vitest");
// Mock useSearch to control the state
const mockSearchContext = {
    isOpen: true,
    query: '',
    setQuery: vitest_1.vi.fn(),
    openSearch: vitest_1.vi.fn(),
    closeSearch: vitest_1.vi.fn(),
    results: [],
    setResults: vitest_1.vi.fn(),
    loading: false,
    setLoading: vitest_1.vi.fn(),
};
// Better approach: Mock the module
vitest_1.vi.mock('@/contexts/SearchContext', () => ({
    useSearch: () => mockSearchContext,
}));
vitest_1.vi.mock('@/components/common/DemoIndicator', () => ({
    useDemoMode: () => true,
}));
describe('GlobalSearch', () => {
    it('renders search input with accessible label', () => {
        (0, react_2.render)(<react_router_dom_1.MemoryRouter>
        <GlobalSearch_1.GlobalSearch />
      </react_router_dom_1.MemoryRouter>);
        // Verify the input has the accessible name "Global Search"
        // Note: CMDK uses aria-labelledby on the input pointing to the label we provided to the Command component
        // This takes precedence over aria-label on the input itself.
        const input = react_2.screen.getByRole('combobox', { name: 'Global Search' });
        expect(input).toBeInTheDocument();
        // Verify the Command root has the label "Global Search" text visible/present in DOM (even if sr-only)
        const commandLabel = react_2.screen.getByText('Global Search');
        expect(commandLabel).toBeInTheDocument();
    });
});
