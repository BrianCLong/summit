"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
// Mock ResizeObserver
global.ResizeObserver = vitest_1.vi.fn().mockImplementation(() => ({
    observe: vitest_1.vi.fn(),
    unobserve: vitest_1.vi.fn(),
    disconnect: vitest_1.vi.fn(),
}));
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vitest_1.vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vitest_1.vi.fn(), // deprecated
        removeListener: vitest_1.vi.fn(), // deprecated
        addEventListener: vitest_1.vi.fn(),
        removeEventListener: vitest_1.vi.fn(),
        dispatchEvent: vitest_1.vi.fn(),
    })),
});
// Mock Recharts
vitest_1.vi.mock('recharts', async () => {
    const Original = await vitest_1.vi.importActual('recharts');
    return {
        ...Original,
        ResponsiveContainer: ({ children }) => react_1.default.createElement('div', { className: "recharts-responsive-container", style: { width: 800, height: 400 } }, children),
        BarChart: ({ children }) => react_1.default.createElement('div', { className: "recharts-bar-chart" }, children),
        LineChart: ({ children }) => react_1.default.createElement('div', { className: "recharts-line-chart" }, children),
        PieChart: ({ children }) => react_1.default.createElement('div', { className: "recharts-pie-chart" }, children),
        RadarChart: ({ children }) => react_1.default.createElement('div', { className: "recharts-radar-chart" }, children),
        ScatterChart: ({ children }) => react_1.default.createElement('div', { className: "recharts-scatter-chart" }, children),
        XAxis: () => null,
        YAxis: () => null,
        Tooltip: () => null,
        CartesianGrid: () => null,
        Legend: () => null,
        Line: () => null,
        Bar: () => null,
        Pie: () => null,
        Cell: () => null,
        Area: () => null,
        Scatter: () => null,
        ReferenceLine: () => null,
        ReferenceDot: () => null,
        ReferenceArea: () => null,
        Brush: () => null,
    };
});
