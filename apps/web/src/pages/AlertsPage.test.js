"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const AlertsPage_1 = __importDefault(require("./AlertsPage"));
// Mock hooks
vitest_1.vi.mock('@/hooks/useGraphQL', () => ({
    useAlerts: vitest_1.vi.fn(),
    useAlertUpdates: vitest_1.vi.fn(),
    useUpdateAlertStatus: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('@/components/common/DemoIndicator', () => ({
    useDemoMode: vitest_1.vi.fn(() => false), // Default to live mode
}));
// Mock UI components to simplify testing
vitest_1.vi.mock('@/components/ui/Card', () => ({
    Card: ({ children }) => <div>{children}</div>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardTitle: ({ children }) => <div>{children}</div>,
    CardContent: ({ children }) => <div>{children}</div>,
}));
vitest_1.vi.mock('@/components/ui/Button', () => ({
    Button: ({ children, onClick, ...props }) => (<button onClick={onClick} {...props}>
      {children}
    </button>),
}));
vitest_1.vi.mock('@/components/ui/Badge', () => ({
    Badge: ({ children }) => <span>{children}</span>,
}));
vitest_1.vi.mock('@/components/ui/Table', () => ({
    Table: ({ children }) => <table>{children}</table>,
}));
vitest_1.vi.mock('@/components/ui/Skeleton', () => ({
    Skeleton: () => <div>Loading...</div>,
}));
vitest_1.vi.mock('@/components/ui/EmptyState', () => ({
    EmptyState: ({ title }) => <div>{title}</div>,
}));
vitest_1.vi.mock('@/components/ui/SearchBar', () => ({
    SearchBar: ({ value, onChange, placeholder }) => (<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid="search-bar"/>),
}));
vitest_1.vi.mock('@/components/panels/KPIStrip', () => ({
    KPIStrip: ({ data }) => (<div data-testid="kpi-strip">
      {data.map((kpi) => (<div key={kpi.id} data-testid={`kpi-${kpi.id}`}>
          {kpi.title}: {kpi.value}
        </div>))}
    </div>),
}));
vitest_1.vi.mock('@/components/ConnectionStatus', () => ({
    ConnectionStatus: () => <div>Connected</div>,
}));
vitest_1.vi.mock('@/components/common/DataIntegrityNotice', () => ({
    DataIntegrityNotice: () => null,
}));
const useGraphQL_1 = require("@/hooks/useGraphQL");
describe('AlertsPage', () => {
    const mockAlertsData = [
        {
            id: '1',
            title: 'Critical Database Error',
            description: 'Connection failed',
            severity: 'critical',
            status: 'open',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            source: 'Database',
            metadata: {},
        },
        {
            id: '2',
            title: 'High CPU Usage',
            description: 'Server overload',
            severity: 'high',
            status: 'investigating',
            createdAt: '2023-01-02T00:00:00Z',
            updatedAt: '2023-01-02T00:00:00Z',
            source: 'Server',
            metadata: {},
        },
        {
            id: '3',
            title: 'Login Failure',
            description: 'Repeated attempts',
            severity: 'medium',
            status: 'resolved',
            createdAt: '2023-01-03T00:00:00Z',
            updatedAt: '2023-01-03T00:00:00Z',
            source: 'Auth',
            metadata: {},
        },
    ];
    beforeEach(() => {
        vitest_1.vi.clearAllMocks();
        useGraphQL_1.useAlerts.mockReturnValue({
            data: { alerts: mockAlertsData },
            loading: false,
            error: null,
            refetch: vitest_1.vi.fn(),
        });
        useGraphQL_1.useAlertUpdates.mockReturnValue({ data: null });
        useGraphQL_1.useUpdateAlertStatus.mockReturnValue([vitest_1.vi.fn()]);
    });
    it('renders alerts list correctly', () => {
        (0, react_1.render)(<AlertsPage_1.default />);
        expect(react_1.screen.getByText('Critical Database Error')).toBeInTheDocument();
        expect(react_1.screen.getByText('High CPU Usage')).toBeInTheDocument();
        expect(react_1.screen.getByText('Login Failure')).toBeInTheDocument();
        // Check KPIs
        expect(react_1.screen.getByTestId('kpi-critical')).toHaveTextContent('Critical Alerts: 1');
        expect(react_1.screen.getByTestId('kpi-active')).toHaveTextContent('Active Alerts: 1'); // Only 'open' status
        expect(react_1.screen.getByTestId('kpi-resolved')).toHaveTextContent('Resolved Today: 1');
    });
    it('filters alerts by search query', async () => {
        (0, react_1.render)(<AlertsPage_1.default />);
        const searchInput = react_1.screen.getByTestId('search-bar');
        react_1.fireEvent.change(searchInput, { target: { value: 'CPU' } });
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.queryByText('Critical Database Error')).not.toBeInTheDocument();
            expect(react_1.screen.getByText('High CPU Usage')).toBeInTheDocument();
        });
    });
    it('filters alerts by severity', async () => {
        (0, react_1.render)(<AlertsPage_1.default />);
        // Find severity select (it's the first select usually, but let's find by text label or role)
        // The component renders: <span className="text-sm font-medium">Severity:</span> <select ...>
        // We can use getAllByRole('combobox') if select is used
        const selects = react_1.screen.getAllByRole('combobox');
        const severitySelect = selects[0]; // Assuming first one is Severity based on order in JSX
        react_1.fireEvent.change(severitySelect, { target: { value: 'critical' } });
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByText('Critical Database Error')).toBeInTheDocument();
            expect(react_1.screen.queryByText('High CPU Usage')).not.toBeInTheDocument();
        });
    });
    it('filters alerts by status', async () => {
        (0, react_1.render)(<AlertsPage_1.default />);
        const selects = react_1.screen.getAllByRole('combobox');
        const statusSelect = selects[1]; // Assuming second one is Status
        react_1.fireEvent.change(statusSelect, { target: { value: 'resolved' } });
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.queryByText('Critical Database Error')).not.toBeInTheDocument(); // status: open
            expect(react_1.screen.getByText('Login Failure')).toBeInTheDocument(); // status: resolved
        });
    });
    it('displays loading state', () => {
        ;
        useGraphQL_1.useAlerts.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: vitest_1.vi.fn(),
        });
        (0, react_1.render)(<AlertsPage_1.default />);
        expect(react_1.screen.getAllByText('Loading...').length).toBeGreaterThan(0);
    });
    it('displays error state', () => {
        ;
        useGraphQL_1.useAlerts.mockReturnValue({
            data: null,
            loading: false,
            error: new Error('Network error'),
            refetch: vitest_1.vi.fn(),
        });
        (0, react_1.render)(<AlertsPage_1.default />);
        expect(react_1.screen.getByText('Failed to load alerts')).toBeInTheDocument();
        expect(react_1.screen.getByText('Network error')).toBeInTheDocument();
    });
});
