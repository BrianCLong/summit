import '@testing-library/jest-dom'
import React from 'react';
import { vi } from 'vitest'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Recharts
vi.mock('recharts', async () => {
  const Original = await vi.importActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { className: "recharts-responsive-container", style: { width: 800, height: 400 } }, children),
    BarChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { className: "recharts-bar-chart" }, children),
    LineChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { className: "recharts-line-chart" }, children),
    PieChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { className: "recharts-pie-chart" }, children),
    RadarChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { className: "recharts-radar-chart" }, children),
    ScatterChart: ({ children }: { children: React.ReactNode }) => React.createElement('div', { className: "recharts-scatter-chart" }, children),
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
