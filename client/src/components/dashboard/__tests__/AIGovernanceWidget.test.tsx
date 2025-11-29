import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIGovernanceWidget from '../AIGovernanceWidget';

describe('AIGovernanceWidget', () => {
  it('renders the widget title', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('AI Governance & Agent Fleet')).toBeInTheDocument();
  });

  it('displays the automated validation rate chip', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('85% Automated')).toBeInTheDocument();
  });

  it('renders key metrics section', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('Policy Validation Rate')).toBeInTheDocument();
    expect(screen.getByText('Human Escalations')).toBeInTheDocument();
    expect(screen.getByText('Active Agents')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
  });

  it('displays the 85% policy validation rate', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders agent fleet status section', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('Agent Fleet Status')).toBeInTheDocument();
  });

  it('displays all mock fleet agents', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('Entity Extraction Fleet')).toBeInTheDocument();
    expect(screen.getByText('Relationship Inference Fleet')).toBeInTheDocument();
    expect(screen.getByText('Anomaly Detection Fleet')).toBeInTheDocument();
    expect(screen.getByText('OSINT Collector Fleet')).toBeInTheDocument();
  });

  it('shows agent status chips', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
    expect(screen.getByText('CONTAINED')).toBeInTheDocument();
  });

  it('displays containment warning when agents are contained', () => {
    render(<AIGovernanceWidget />);
    expect(
      screen.getByText(/agent\(s\) automatically contained/i),
    ).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    render(<AIGovernanceWidget />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });

    expect(refreshButton).not.toBeDisabled();
    fireEvent.click(refreshButton);

    // Button should be disabled while refreshing
    expect(refreshButton).toBeDisabled();

    // Wait for refresh to complete
    await waitFor(
      () => {
        expect(refreshButton).not.toBeDisabled();
      },
      { timeout: 2000 },
    );
  });

  it('displays compliance percentage for each agent', () => {
    render(<AIGovernanceWidget />);
    // Check for compliance labels
    const complianceLabels = screen.getAllByText('Compliance');
    expect(complianceLabels.length).toBe(4);
  });

  it('shows incident count for agents with incidents', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('1 incidents')).toBeInTheDocument();
    expect(screen.getByText('3 incidents')).toBeInTheDocument();
  });

  it('displays response time metric', () => {
    render(<AIGovernanceWidget />);
    expect(screen.getByText('47ms')).toBeInTheDocument();
  });

  it('renders with correct accessibility attributes', () => {
    render(<AIGovernanceWidget />);
    // Check that the widget is rendered as a card
    const card = screen.getByText('AI Governance & Agent Fleet').closest('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });
});
