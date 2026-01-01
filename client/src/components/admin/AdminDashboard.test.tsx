import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminDashboard from './AdminDashboard';

const renderDashboard = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <AdminDashboard />
    </ThemeProvider>,
  );

describe('AdminDashboard', () => {
  test('renders core administrative sections', () => {
    renderDashboard();

    expect(screen.getByText(/Summit Admin Control Center/i)).toBeInTheDocument();
    expect(screen.getByText(/User management/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit log/i)).toBeInTheDocument();
    expect(screen.getByText(/System health/i)).toBeInTheDocument();
  });

  test('allows updating roles and batch status', async () => {
    renderDashboard();

    const rolesSelect = screen.getByLabelText(/Roles for Alice Carter/i);
    fireEvent.mouseDown(rolesSelect);
    const supportOption = await screen.findByRole('option', { name: 'Support' });
    fireEvent.click(supportOption);

    expect(screen.getAllByText('Support').length).toBeGreaterThan(1);

    const selectionCheckbox = screen.getByTestId('select-user-1');
    fireEvent.click(selectionCheckbox);

    const suspendButton = screen.getByRole('button', { name: /Suspend/i });
    expect(suspendButton).not.toBeDisabled();

    fireEvent.click(suspendButton);

    expect(screen.getByTestId('status-user-1')).toHaveTextContent('Suspended');
  });

  test('filters audit entries by severity', async () => {
    renderDashboard();

    const severitySelect = screen.getByLabelText(/Severity/i);
    fireEvent.mouseDown(severitySelect);
    const securityOption = await screen.findByRole('option', { name: /Security/i });
    fireEvent.click(securityOption);

    expect(screen.getByText(/Privilege escalation blocked/i)).toBeInTheDocument();
    expect(screen.queryByText(/Weekly backup completed/i)).not.toBeInTheDocument();
  });

  test('toggles feature flags', () => {
    renderDashboard();
    console.log('DOM DUMP:', document.body.innerHTML);

    const flagToggle = screen.getByTestId('flag-graph-heuristics');
    expect(flagToggle).not.toBeChecked();

    fireEvent.click(flagToggle);

    expect(flagToggle).toBeChecked();
  });
});
