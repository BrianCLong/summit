/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, afterEach, jest } from '@jest/globals';
import { ThemeProvider } from '@mui/material/styles';
import { PageShell } from '../components/PageShell';
import { SettingsLayout } from '../components/SettingsLayout';
import { DataTable } from '../components/DataTable';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { DesignSystemTelemetry } from '../telemetry';
import { buildDesignSystemTheme } from '../theme';
import { lightTokens } from '../tokens';
import { TelemetryContext } from '../DesignSystemProvider';

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = buildDesignSystemTheme({ mode: 'light', tokens: lightTokens });
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Design system components', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders permission gating message in PageShell', () => {
    renderWithTheme(
      <PageShell title="Settings" permission={{ allowed: false, reason: 'Requires admin' }}>
        <div>content</div>
      </PageShell>,
    );
    expect(screen.getByText(/You don’t have access/)).toBeInTheDocument();
    expect(screen.getByText(/Requires admin/)).toBeInTheDocument();
  });

  it('tracks sections in SettingsLayout telemetry', () => {
    const telemetry = new DesignSystemTelemetry(
      {
        send: jest.fn().mockResolvedValue(undefined as any) as any,
      },
      { autoFlushMs: null },
    );
    const recordSpy = jest.spyOn(telemetry, 'record');
    renderWithTheme(
      <TelemetryContext.Provider value={telemetry as unknown as DesignSystemTelemetry}>
        <SettingsLayout
          title="Account"
          sections={[
            { title: 'Profile', description: 'User profile', content: <div>Profile</div> },
            { title: 'Notifications', content: <div>Notifications</div> },
          ]}
        />
      </TelemetryContext.Provider>,
    );
    expect(recordSpy).toHaveBeenCalledWith('SettingsLayout', '1.0.0', { sections: ['Profile', 'Notifications'] });
  });

  it('shows empty state and retry for DataTable', () => {
    const handleRetry = jest.fn();
    renderWithTheme(
      <DataTable
        title="Investigations"
        rows={[]}
        columns={[{ field: 'name', headerName: 'Name', width: 150 }]}
        loading={false}
        onRetry={handleRetry}
      />,
    );
    expect(screen.getByText(/No results found/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(handleRetry).toHaveBeenCalled();
  });

  it('persists onboarding wizard progress', () => {
    const flowId = 'setup';
    const steps = [
      { id: 'welcome', title: 'Welcome', render: () => <div>Welcome</div>, isComplete: () => true },
      { id: 'profile', title: 'Profile', render: () => <div>Profile</div>, isComplete: () => true },
    ];
    renderWithTheme(<OnboardingWizard flowId={flowId} steps={steps} />);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(localStorage.getItem('onboarding-wizard:setup')).toBe('1');
  });
});
