/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LineChart } from '../charts/LineChart';
import type { DataPoint } from '../types';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('LineChart', () => {
  const mockData: DataPoint[] = [
    { x: 0, y: 10, label: 'Point 1' },
    { x: 1, y: 20, label: 'Point 2' },
    { x: 2, y: 15, label: 'Point 3' },
    { x: 3, y: 25, label: 'Point 4' },
    { x: 4, y: 30, label: 'Point 5' },
  ];

  it('renders without crashing', () => {
    const { container } = render(<LineChart data={mockData} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    const { container } = render(<LineChart data={[]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders correct number of data points', async () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={{ showPoints: true, animation: { enabled: false } }}
      />
    );

    await waitFor(() => {
      const points = container.querySelectorAll('.line-point');
      expect(points.length).toBe(mockData.length);
    });
  });

  it('renders line path', async () => {
    const { container } = render(
      <LineChart data={mockData} config={{ animation: { enabled: false } }} />
    );

    await waitFor(() => {
      const linePath = container.querySelector('.line-path');
      expect(linePath).toBeInTheDocument();
    });
  });

  it('renders x and y axes', async () => {
    const { container } = render(
      <LineChart data={mockData} config={{ animation: { enabled: false } }} />
    );

    await waitFor(() => {
      const xAxis = container.querySelector('.x-axis');
      const yAxis = container.querySelector('.y-axis');
      expect(xAxis).toBeInTheDocument();
      expect(yAxis).toBeInTheDocument();
    });
  });

  it('applies custom dimensions', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={{ width: 1000, height: 500, responsive: false }}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '1000');
    expect(svg).toHaveAttribute('height', '500');
  });

  it('applies custom theme colors', async () => {
    const customColor = '#ff0000';
    const { container } = render(
      <LineChart
        data={mockData}
        config={{
          theme: { accentColor: customColor },
          animation: { enabled: false },
        }}
      />
    );

    await waitFor(() => {
      const linePath = container.querySelector('.line-path');
      expect(linePath).toHaveAttribute('stroke', customColor);
    });
  });

  it('handles onClick event', async () => {
    const handleClick = jest.fn();
    const { container } = render(
      <LineChart
        data={mockData}
        config={{ showPoints: true, animation: { enabled: false } }}
        events={{ onClick: handleClick }}
      />
    );

    await waitFor(() => {
      const firstPoint = container.querySelector('.line-point');
      if (firstPoint) {
        fireEvent.click(firstPoint);
        expect(handleClick).toHaveBeenCalled();
      }
    });
  });

  it('renders area fill when enabled', async () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={{ fillArea: true, animation: { enabled: false } }}
      />
    );

    await waitFor(() => {
      const areaPath = container.querySelector('.line-area');
      expect(areaPath).toBeInTheDocument();
    });
  });

  it('renders title when provided', async () => {
    const title = 'Test Chart Title';
    const { container } = render(
      <LineChart
        data={mockData}
        config={{ title, animation: { enabled: false } }}
      />
    );

    await waitFor(() => {
      const titleElement = container.querySelector('.chart-title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement?.textContent).toBe(title);
    });
  });

  it('handles date x-axis data', async () => {
    const dateData: DataPoint[] = [
      { x: new Date('2024-01-01'), y: 10 },
      { x: new Date('2024-01-02'), y: 20 },
      { x: new Date('2024-01-03'), y: 15 },
    ];

    const { container } = render(
      <LineChart data={dateData} config={{ animation: { enabled: false } }} />
    );

    await waitFor(() => {
      const linePath = container.querySelector('.line-path');
      expect(linePath).toBeInTheDocument();
    });
  });

  it('renders without animation when disabled', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        config={{ animation: { enabled: false } }}
      />
    );

    // Component should render immediately without animation
    const linePath = container.querySelector('.line-path');
    expect(linePath).toBeInTheDocument();
  });
});
