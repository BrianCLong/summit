/**
 * Tests for Enhanced Analytics Dashboard Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnhancedAnalyticsDashboard from '../EnhancedAnalyticsDashboard';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EnhancedAnalyticsDashboard', () => {
  let consoleSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:30:45Z'));
    // Suppress MUI Grid warnings globally
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation((message) => {
      if (!message.includes('MUI Grid')) {
        console.error(message);
      }
    });
  });

  afterEach(() => {
    // Only run pending timers if we're using fake timers
    try {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    } catch (e) {
      // Ignore errors if fake timers aren't active
    }
    jest.useRealTimers();
    jest.clearAllMocks();
    if (consoleSpy) {
      consoleSpy.mockRestore();
    }
  });

  it('renders dashboard header with title and controls', () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    
    // Check control elements - find by the select role instead of label
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Real-time')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Export Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('displays metric cards with key metrics', () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    // Check for metric cards
    expect(screen.getByText('Total Entities')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Avg Query Time')).toBeInTheDocument();
    expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
    expect(screen.getByText('Security Alerts')).toBeInTheDocument();
    expect(screen.getByText('API Calls/Hour')).toBeInTheDocument();

    // Check for formatted values
    expect(screen.getByText(/15,842/)).toBeInTheDocument();
    expect(screen.getByText(/94\.2%/)).toBeInTheDocument();
  });

  it('shows real-time monitoring alert when enabled', () => {
    renderWithTheme(<EnhancedAnalyticsDashboard realTimeEnabled={true} />);

    expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument();
    expect(screen.getByText('Updates every 60s')).toBeInTheDocument();
  });

  it('renders time range selector with default value', () => {
    const onConfigChange = jest.fn();
    
    renderWithTheme(
      <EnhancedAnalyticsDashboard onConfigChange={onConfigChange} />
    );

    // Verify the time range select is present
    const timeRangeSelect = screen.getByRole('combobox');
    expect(timeRangeSelect).toBeInTheDocument();
    
    // Verify it displays the default text (24h corresponds to "Last 24 Hours")
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
  });

  it('toggles real-time monitoring', async () => {
    const onConfigChange = jest.fn();
    
    renderWithTheme(
      <EnhancedAnalyticsDashboard onConfigChange={onConfigChange} />
    );

    const realTimeSwitch = screen.getByRole('switch', { name: /real-time/i });
    expect(realTimeSwitch).toBeChecked();

    // Use fireEvent for more reliable test
    fireEvent.click(realTimeSwitch);

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        showRealTime: false
      })
    );
  });

  it('handles refresh button click', async () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    const refreshButton = screen.getByLabelText('Refresh Data');
    fireEvent.click(refreshButton);

    // Should show loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Advance timers to complete the loading
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('renders navigation tabs and switches between them', async () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    // Check all tabs are present
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Usage')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();

    // Click on Performance tab
    fireEvent.click(screen.getByText('Performance'));
    
    expect(screen.getByText('Performance analytics view coming soon...')).toBeInTheDocument();

    // Click on Usage tab
    fireEvent.click(screen.getByText('Usage'));
    
    expect(screen.getByText('Usage analytics view coming soon...')).toBeInTheDocument();
  });

  it('calls onExport when export button is clicked', async () => {
    const onExport = jest.fn();
    
    renderWithTheme(<EnhancedAnalyticsDashboard onExport={onExport} />);

    const exportButton = screen.getByLabelText('Export Data');
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('shows appropriate category labels for metrics', () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    // Check that metrics have category chips
    expect(screen.getAllByText('usage')).toHaveLength(3);
    expect(screen.getAllByText('performance')).toHaveLength(1);
    expect(screen.getAllByText('quality')).toHaveLength(1);
    expect(screen.getAllByText('security')).toHaveLength(1);
  });

  it('handles loading states properly', async () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    const refreshButton = screen.getByLabelText('Refresh Data');
    fireEvent.click(refreshButton);

    // Should show loading progress bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Refresh button should be disabled during loading
    expect(refreshButton).toBeDisabled();
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    // Check for proper ARIA labels
    expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Export Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Check that tabs have proper roles
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
  });

  it('formats metric values correctly', () => {
    renderWithTheme(<EnhancedAnalyticsDashboard />);

    // Check number formatting
    expect(screen.getByText(/15,842/)).toBeInTheDocument();
    expect(screen.getByText(/94\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/245ms/)).toBeInTheDocument();
  });
});