"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const TransformSearch_1 = require("./TransformSearch");
global.fetch = vitest_1.vi.fn();
const mockTransforms = [
    {
        id: 'TRANS-001',
        name: 'To IP Address',
        description: 'Resolves a domain to an IP address.',
        inputTypes: ['Domain'],
        outputTypes: ['IPv4Address'],
    },
    {
        id: 'TRANS-002',
        name: 'To DNS Name',
        description: 'Resolves an IP address to a DNS name.',
        inputTypes: ['IPv4Address'],
        outputTypes: ['Domain'],
    },
];
(0, vitest_1.describe)('TransformSearch', () => {
    (0, vitest_1.beforeEach)(() => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ transforms: mockTransforms }),
        });
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('renders search input and initial transforms', async () => {
        (0, react_1.render)(<TransformSearch_1.TransformSearch />);
        // Expect loading state first if needed, but waitFor handles async appearance
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(react_1.screen.getByText('Run Transforms')).toBeInTheDocument();
        });
        (0, vitest_1.expect)(react_1.screen.getByTestId('transform-search-input')).toBeInTheDocument();
        // Check for mock data
        (0, vitest_1.expect)(react_1.screen.getByText('To IP Address')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText('To DNS Name')).toBeInTheDocument();
    });
    (0, vitest_1.it)('filters transforms based on search query', async () => {
        (0, react_1.render)(<TransformSearch_1.TransformSearch />);
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(react_1.screen.getByText('To IP Address')).toBeInTheDocument();
        });
        const input = react_1.screen.getByTestId('transform-search-input');
        // Search for "DNS"
        react_1.fireEvent.change(input, { target: { value: 'DNS' } });
        (0, vitest_1.expect)(react_1.screen.queryByText('To IP Address')).not.toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText('To DNS Name')).toBeInTheDocument();
    });
    (0, vitest_1.it)('shows error on fetch fail', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
        });
        (0, react_1.render)(<TransformSearch_1.TransformSearch />);
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(react_1.screen.getByText('Error loading transforms')).toBeInTheDocument();
        });
    });
});
