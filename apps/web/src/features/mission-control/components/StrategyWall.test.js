"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const StrategyWall_1 = __importDefault(require("./StrategyWall"));
const vitest_1 = require("vitest");
const react_2 = __importDefault(require("react"));
(0, vitest_1.describe)('StrategyWall', () => {
    (0, vitest_1.it)('renders loading state', () => {
        (0, react_1.render)(<StrategyWall_1.default plan={null} loading={true}/>);
        (0, vitest_1.expect)(react_1.screen.getByText('Loading Strategy Wall...')).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders plan data', () => {
        const mockPlan = {
            objectives: [{ id: '1', name: 'Test Obj', status: 'ON_TRACK', progress: 50 }],
            initiatives: [{ id: '2', name: 'Test Init', status: 'IN_PROGRESS' }],
            kpis: [{ id: '3', name: 'Test KPI', currentValue: 10, unit: '%' }]
        };
        (0, react_1.render)(<StrategyWall_1.default plan={mockPlan} loading={false}/>);
        (0, vitest_1.expect)(react_1.screen.getByText('Test Obj')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText('Test Init')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText('Test KPI')).toBeInTheDocument();
    });
});
