"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const AuditTimeline_1 = __importDefault(require("./AuditTimeline"));
const mockFetcher = (events) => jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: events }),
});
describe('AuditTimeline', () => {
    it('renders deep links for resource paths and labels', async () => {
        const fetcher = mockFetcher([
            {
                id: '1',
                timestamp: '2024-01-01T00:00:00Z',
                action: 'create',
                resourcePath: '/investigations/123',
                resourceName: 'Investigation 123',
                correlationId: 'corr-1',
                outcome: 'success',
            },
        ]);
        (0, react_2.render)(<AuditTimeline_1.default correlationIds={['corr-1']} fetcher={fetcher} apiBaseUrl="http://example.test"/>);
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText('Investigation 123')).toBeInTheDocument());
        const link = react_2.screen.getByTestId('resource-link');
        expect(link).toHaveAttribute('href', '/investigations/123');
        expect(react_2.screen.getByText('Correlation corr-1')).toBeInTheDocument();
    });
    it('shows fallbacks when data is missing', async () => {
        const fetcher = mockFetcher([
            {
                id: '2',
                correlationId: 'corr-2',
            },
        ]);
        (0, react_2.render)(<AuditTimeline_1.default correlationIds={['corr-2']} fetcher={fetcher}/>);
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText('No details available')).toBeInTheDocument());
        expect(react_2.screen.getByText('No additional context provided.')).toBeInTheDocument();
        expect(react_2.screen.getByText('No resource link available')).toBeInTheDocument();
        expect(react_2.screen.getByText('Unknown time')).toBeInTheDocument();
    });
});
