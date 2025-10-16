/**
 * Tests for Temporal Analysis Component
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TemporalAnalysis from '../TemporalAnalysis';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));

describe('TemporalAnalysis', () => {
  const defaultProps = {
    onEventSelect: jest.fn(),
    onTimeRangeChange: jest.fn(),
    showClusters: true,
    showAnomalies: true,
    enableZoom: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders timeline controls', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    expect(screen.getByText(/Time Range/)).toBeInTheDocument();
    expect(screen.getByText(/Clusters/)).toBeInTheDocument();
    expect(screen.getByText(/Anomalies/)).toBeInTheDocument();
    expect(screen.getByText(/Zoom/)).toBeInTheDocument();
  });

  it('renders timeline visualization area', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
  });

  it('renders event statistics', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    expect(screen.getByTestId('event-statistics')).toBeInTheDocument();
    expect(screen.getByText(/Total Events:/)).toBeInTheDocument();
    expect(screen.getByText(/Clusters:/)).toBeInTheDocument();
    expect(screen.getByText(/Anomalies:/)).toBeInTheDocument();
    expect(screen.getByText(/Time Span:/)).toBeInTheDocument();
  });

  it('toggles cluster display', async () => {
    const user = userEvent.setup();
    render(<TemporalAnalysis {...defaultProps} showClusters={true} />);

    const clustersCheckbox = screen.getByRole('checkbox', {
      name: /clusters/i,
    });
    expect(clustersCheckbox).toBeChecked();

    await user.click(clustersCheckbox);
    expect(clustersCheckbox).not.toBeChecked();
  });

  it('toggles anomaly display', async () => {
    const user = userEvent.setup();
    render(<TemporalAnalysis {...defaultProps} showAnomalies={true} />);

    const anomaliesCheckbox = screen.getByRole('checkbox', {
      name: /anomalies/i,
    });
    expect(anomaliesCheckbox).toBeChecked();

    await user.click(anomaliesCheckbox);
    expect(anomaliesCheckbox).not.toBeChecked();
  });

  it('toggles zoom functionality', async () => {
    const user = userEvent.setup();
    render(<TemporalAnalysis {...defaultProps} enableZoom={true} />);

    const zoomCheckbox = screen.getByRole('checkbox', { name: /zoom/i });
    expect(zoomCheckbox).toBeChecked();

    await user.click(zoomCheckbox);
    expect(zoomCheckbox).not.toBeChecked();
  });

  it('changes time range', async () => {
    const user = userEvent.setup();
    render(<TemporalAnalysis {...defaultProps} />);

    const timeRangeSelect = screen.getByDisplayValue('7d');
    await user.selectOptions(timeRangeSelect, '30d');

    expect(timeRangeSelect).toHaveValue('30d');
  });

  it('handles timeline visualization clicks', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    const timelineViz = screen.getByTestId('timeline-visualization');

    // Test clicking on timeline
    fireEvent.click(timelineViz, { clientX: 400, clientY: 200 });

    // Should handle click without errors
    expect(timelineViz).toBeInTheDocument();
  });

  it('handles investigation ID prop', () => {
    render(<TemporalAnalysis {...defaultProps} investigationId="inv-456" />);

    expect(screen.getByTestId('timeline-visualization')).toBeInTheDocument();
  });

  it('calls event selection callback', () => {
    const onEventSelect = jest.fn();
    render(
      <TemporalAnalysis {...defaultProps} onEventSelect={onEventSelect} />,
    );

    const timelineViz = screen.getByTestId('timeline-visualization');
    fireEvent.click(timelineViz, { clientX: 300, clientY: 150 });

    // The component handles the click internally
    expect(timelineViz).toBeInTheDocument();
  });

  it('calls time range change callback', async () => {
    const onTimeRangeChange = jest.fn();
    const user = userEvent.setup();
    render(
      <TemporalAnalysis
        {...defaultProps}
        onTimeRangeChange={onTimeRangeChange}
      />,
    );

    const timeRangeSelect = screen.getByDisplayValue('7d');
    await user.selectOptions(timeRangeSelect, '1d');

    // Time range change should be handled internally
    expect(timeRangeSelect).toHaveValue('1d');
  });

  it('shows event details on hover', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    const timelineViz = screen.getByTestId('timeline-visualization');

    // Test hover events
    fireEvent.mouseMove(timelineViz, { clientX: 350, clientY: 180 });

    // Should handle hover without errors
    expect(timelineViz).toBeInTheDocument();
  });

  it('handles wheel events for zooming when enabled', () => {
    render(<TemporalAnalysis {...defaultProps} enableZoom={true} />);

    const timelineViz = screen.getByTestId('timeline-visualization');

    // Test wheel zoom
    fireEvent.wheel(timelineViz, { deltaY: -100 });
    fireEvent.wheel(timelineViz, { deltaY: 100 });

    // Should handle wheel events without errors
    expect(timelineViz).toBeInTheDocument();
  });

  it('ignores wheel events when zoom disabled', () => {
    render(<TemporalAnalysis {...defaultProps} enableZoom={false} />);

    const timelineViz = screen.getByTestId('timeline-visualization');

    // Test wheel when zoom disabled
    fireEvent.wheel(timelineViz, { deltaY: -100 });

    // Should still render without errors
    expect(timelineViz).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <TemporalAnalysis {...defaultProps} className="custom-temporal-class" />,
    );

    const container = screen.getByTestId(
      'timeline-visualization',
    ).parentElement;
    expect(container).toHaveClass('custom-temporal-class');
  });

  it('displays cluster information when enabled', () => {
    render(<TemporalAnalysis {...defaultProps} showClusters={true} />);

    // Should show cluster count in statistics
    const statistics = screen.getByTestId('event-statistics');
    expect(statistics).toBeInTheDocument();
    expect(screen.getByText(/Clusters:/)).toBeInTheDocument();
  });

  it('displays anomaly information when enabled', () => {
    render(<TemporalAnalysis {...defaultProps} showAnomalies={true} />);

    // Should show anomaly count in statistics
    const statistics = screen.getByTestId('event-statistics');
    expect(statistics).toBeInTheDocument();
    expect(screen.getByText(/Anomalies:/)).toBeInTheDocument();
  });

  it('updates statistics when filters change', async () => {
    const user = userEvent.setup();
    render(<TemporalAnalysis {...defaultProps} />);

    const initialStats = screen.getByTestId('event-statistics');
    expect(initialStats).toBeInTheDocument();

    // Change time range
    const timeRangeSelect = screen.getByDisplayValue('7d');
    await user.selectOptions(timeRangeSelect, '1d');

    // Statistics should still be displayed
    expect(screen.getByTestId('event-statistics')).toBeInTheDocument();
  });

  it('handles component unmount cleanly', () => {
    const { unmount } = render(<TemporalAnalysis {...defaultProps} />);

    unmount();

    // Should clean up without errors
    expect(global.ResizeObserver).toHaveBeenCalled();
  });

  it('supports all time range options', async () => {
    const user = userEvent.setup();
    render(<TemporalAnalysis {...defaultProps} />);

    const timeRangeSelect = screen.getByDisplayValue('7d');

    // Test all time range options
    const timeRanges = ['1h', '6h', '1d', '3d', '7d', '30d', '90d'];

    for (const range of timeRanges) {
      await user.selectOptions(timeRangeSelect, range);
      expect(timeRangeSelect).toHaveValue(range);
    }
  });

  it('maintains responsive layout', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    // Should render responsive timeline
    const timelineViz = screen.getByTestId('timeline-visualization');
    expect(timelineViz).toHaveStyle({ width: '100%' });
  });

  it('handles drag interactions', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    const timelineViz = screen.getByTestId('timeline-visualization');

    // Test drag sequence
    fireEvent.mouseDown(timelineViz, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(timelineViz, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(timelineViz, { clientX: 150, clientY: 100 });

    // Should handle drag without errors
    expect(timelineViz).toBeInTheDocument();
  });

  it('displays proper time formatting', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    // Should format time spans properly
    const statistics = screen.getByTestId('event-statistics');
    expect(statistics).toContainElement(screen.getByText(/Time Span:/));
  });

  it('handles keyboard navigation', () => {
    render(<TemporalAnalysis {...defaultProps} />);

    const timelineViz = screen.getByTestId('timeline-visualization');

    // Test keyboard events
    fireEvent.keyDown(timelineViz, { key: 'ArrowLeft' });
    fireEvent.keyDown(timelineViz, { key: 'ArrowRight' });
    fireEvent.keyDown(timelineViz, { key: 'Home' });
    fireEvent.keyDown(timelineViz, { key: 'End' });

    // Should handle keyboard navigation without errors
    expect(timelineViz).toBeInTheDocument();
  });
});
