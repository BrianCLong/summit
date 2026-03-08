"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const DashboardPage_1 = require("../DashboardPage");
const api_1 = require("../../api");
// Mock the API
jest.mock('../../api', () => ({
    api: {
        dashboard: {
            get: jest.fn(),
        },
    },
}));
describe('DashboardPage', () => {
    it('renders loading state initially', () => {
        api_1.api.dashboard.get.mockImplementation(() => new Promise(() => { }));
        (0, react_2.render)(<DashboardPage_1.DashboardPage />);
        expect(react_2.screen.getByRole('progressbar')).toBeInTheDocument();
    });
    it('renders dashboard data correctly', async () => {
        api_1.api.dashboard.get.mockResolvedValue({
            health: {
                overallScore: 95,
                workstreams: [{ name: 'Core', status: 'healthy', score: 98 }],
                activeAlerts: [],
            },
            stats: {
                activeRuns: 5,
                completedRuns: 10,
                failedRuns: 1,
                tasksPerMinute: 42,
            },
            autonomic: {
                activeLoops: 3,
                totalLoops: 3,
                recentDecisions: ['Scaled up'],
            },
        });
        (0, react_2.render)(<DashboardPage_1.DashboardPage />);
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('95%')).toBeInTheDocument();
            expect(react_2.screen.getByText('Core')).toBeInTheDocument();
            expect(react_2.screen.getByText('Active Runs')).toBeInTheDocument();
        });
    });
    it('displays error message on failure', async () => {
        api_1.api.dashboard.get.mockRejectedValue(new Error('API Error'));
        (0, react_2.render)(<DashboardPage_1.DashboardPage />);
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('API Error')).toBeInTheDocument();
        });
    });
});
