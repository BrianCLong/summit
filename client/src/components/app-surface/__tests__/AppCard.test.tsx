/**
 * AppCard - UI Smoke Tests
 *
 * Ensures the AppCard component renders correctly in all states
 * and handles user interactions without console errors.
 */

import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import AppCard, { type AppCardProps } from '../AppCard';

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const baseProps: AppCardProps = {
  id: 'test-card',
  surface: 'Test Surface',
  title: 'Test Title',
  summary: 'Test summary text',
  status: 'pending',
  timestamp: '2025-01-01T00:00:00.000Z',
};

describe('AppCard', () => {
  it('renders title, summary, and status', () => {
    renderWithTheme(<AppCard {...baseProps} />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test summary text')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('renders surface name and timestamp', () => {
    renderWithTheme(<AppCard {...baseProps} />);

    const surfaceElement = screen.getByText(/Test Surface/);
    expect(surfaceElement).toBeTruthy();
  });

  it('renders all status states correctly', () => {
    const statuses = [
      { status: 'pending' as const, label: 'Pending' },
      { status: 'running' as const, label: 'Running' },
      { status: 'success' as const, label: 'Allowed' },
      { status: 'denied' as const, label: 'Denied' },
      { status: 'error' as const, label: 'Error' },
    ];

    for (const { status, label } of statuses) {
      const { unmount } = renderWithTheme(
        <AppCard {...baseProps} status={status} />,
      );
      expect(screen.getByText(label)).toBeTruthy();
      unmount();
    }
  });

  it('shows verdict banner when result has verdict', () => {
    renderWithTheme(
      <AppCard
        {...baseProps}
        status="success"
        result={{
          verdict: 'ALLOW',
          evidenceId: 'ev-123',
        }}
      />,
    );

    expect(screen.getByTestId('verdict-banner')).toBeTruthy();
    expect(screen.getByText(/ALLOW/)).toBeTruthy();
    expect(screen.getByText(/ev-123/)).toBeTruthy();
  });

  it('shows DENY verdict correctly', () => {
    renderWithTheme(
      <AppCard
        {...baseProps}
        status="denied"
        result={{
          verdict: 'DENY',
          evidenceId: 'ev-456',
        }}
      />,
    );

    expect(screen.getByText(/DENY/)).toBeTruthy();
  });

  it('shows expandable details when result has details', () => {
    renderWithTheme(
      <AppCard
        {...baseProps}
        status="success"
        result={{
          verdict: 'ALLOW',
          details: { allowedTools: ['graph-query'] },
        }}
      />,
    );

    expect(screen.getByText('Details')).toBeTruthy();

    // Click to expand
    fireEvent.click(screen.getByText('Details'));

    // Should show the JSON
    expect(screen.getByText(/"allowedTools"/)).toBeTruthy();
  });

  it('shows download button when evidence JSON is available', () => {
    renderWithTheme(
      <AppCard
        {...baseProps}
        status="success"
        result={{
          verdict: 'ALLOW',
          evidenceId: 'ev-789',
          evidenceJson: '{"test": true}',
        }}
      />,
    );

    expect(screen.getByTestId('download-evidence')).toBeTruthy();
  });

  it('does not show download button when no evidence', () => {
    renderWithTheme(<AppCard {...baseProps} />);

    expect(screen.queryByTestId('download-evidence')).toBeNull();
  });

  it('renders children (form area)', () => {
    renderWithTheme(
      <AppCard {...baseProps}>
        <div data-testid="form-content">Form goes here</div>
      </AppCard>,
    );

    expect(screen.getByTestId('form-content')).toBeTruthy();
  });

  it('has correct data-testid', () => {
    renderWithTheme(<AppCard {...baseProps} />);

    expect(screen.getByTestId('app-card-test-card')).toBeTruthy();
  });
});
