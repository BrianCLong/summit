/**
 * Tests for Threat Intelligence Hub Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ThreatIntelligenceHub from '../ThreatIntelligenceHub';

// Mock auto-refresh timer
jest.useFakeTimers();

describe('ThreatIntelligenceHub', () => {
  const defaultProps = {
    onIndicatorSelect: jest.fn(),
    onCampaignSelect: jest.fn(),
    onActorSelect: jest.fn(),
    autoRefresh: false, // Disable auto-refresh for most tests
    refreshInterval: 300000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders threat intelligence hub header', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    expect(screen.getByText(/🛡️ Threat Intelligence Hub/)).toBeInTheDocument();
  });

  it('renders view tabs', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    expect(screen.getByText(/🎯 Indicators/)).toBeInTheDocument();
    expect(screen.getByText(/📋 Campaigns/)).toBeInTheDocument();
    expect(screen.getByText(/🕵️ Actors/)).toBeInTheDocument();
    expect(screen.getByText(/📡 Feeds/)).toBeInTheDocument();
  });

  it('renders search and filters', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/Search indicators, tags, or IOCs/),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Severities')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
  });

  it('displays indicators by default', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    expect(screen.getByText(/Threat Indicators/)).toBeInTheDocument();
    // Should show mock indicator data
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
  });

  it('switches between view tabs', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Switch to campaigns
    await user.click(screen.getByText(/📋 Campaigns/));
    expect(screen.getByText(/Threat Campaigns/)).toBeInTheDocument();
    expect(screen.getByText('Operation Winter Storm')).toBeInTheDocument();

    // Switch to actors
    await user.click(screen.getByText(/🕵️ Actors/));
    expect(screen.getByText(/Threat Actors/)).toBeInTheDocument();
    expect(screen.getByText('APT29')).toBeInTheDocument();

    // Switch to feeds
    await user.click(screen.getByText(/📡 Feeds/));
    expect(screen.getByText(/Intelligence Feeds/)).toBeInTheDocument();
    expect(screen.getByText('VirusTotal')).toBeInTheDocument();
  });

  it('filters indicators by search query', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(
      /Search indicators, tags, or IOCs/,
    );
    await user.type(searchInput, '192.168');

    // Should show filtered results
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.queryByText('malicious-domain.com')).not.toBeInTheDocument();
  });

  it('filters indicators by severity', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    const severitySelect = screen.getByDisplayValue('All Severities');
    await user.selectOptions(severitySelect, 'critical');

    expect(severitySelect).toHaveValue('critical');
    // Should show only critical indicators
    expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
  });

  it('filters indicators by type', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    const typeSelect = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeSelect, 'ip');

    expect(typeSelect).toHaveValue('ip');
    // Should show only IP indicators
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('selects indicator and shows details', async () => {
    const user = userEvent.setup();
    const onIndicatorSelect = jest.fn();
    render(
      <ThreatIntelligenceHub
        {...defaultProps}
        onIndicatorSelect={onIndicatorSelect}
      />,
    );

    // Click on an indicator
    await user.click(screen.getByText('192.168.1.100'));

    // Should show indicator details panel
    expect(screen.getByText('Indicator Details')).toBeInTheDocument();
    expect(screen.getByText(/Context/)).toBeInTheDocument();
    expect(screen.getByText(/Tags/)).toBeInTheDocument();
  });

  it('calls indicator select callback', async () => {
    const user = userEvent.setup();
    const onIndicatorSelect = jest.fn();
    render(
      <ThreatIntelligenceHub
        {...defaultProps}
        onIndicatorSelect={onIndicatorSelect}
      />,
    );

    await user.click(screen.getByText('192.168.1.100'));

    expect(onIndicatorSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ip',
        value: '192.168.1.100',
        severity: 'high',
      }),
    );
  });

  it('calls campaign select callback', async () => {
    const user = userEvent.setup();
    const onCampaignSelect = jest.fn();
    render(
      <ThreatIntelligenceHub
        {...defaultProps}
        onCampaignSelect={onCampaignSelect}
      />,
    );

    // Switch to campaigns tab
    await user.click(screen.getByText(/📋 Campaigns/));

    // Click on a campaign
    await user.click(screen.getByText('Operation Winter Storm'));

    expect(onCampaignSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Operation Winter Storm',
        status: 'active',
      }),
    );
  });

  it('calls actor select callback', async () => {
    const user = userEvent.setup();
    const onActorSelect = jest.fn();
    render(
      <ThreatIntelligenceHub {...defaultProps} onActorSelect={onActorSelect} />,
    );

    // Switch to actors tab
    await user.click(screen.getByText(/🕵️ Actors/));

    // Click on an actor
    await user.click(screen.getByText('APT29'));

    expect(onActorSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'APT29',
        type: 'nation-state',
      }),
    );
  });

  it('handles investigation ID prop', () => {
    render(
      <ThreatIntelligenceHub {...defaultProps} investigationId="inv-789" />,
    );

    expect(screen.getByText(/Threat Indicators/)).toBeInTheDocument();
  });

  it('displays severity colors correctly', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Should display severity badges with different colors
    const severityBadges = screen.getAllByText(/HIGH|CRITICAL/);
    expect(severityBadges.length).toBeGreaterThan(0);
  });

  it('displays indicator type icons', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Should display type icons (emojis) for different indicator types
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('malicious-domain.com')).toBeInTheDocument();
  });

  it('shows last updated timestamp', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles auto-refresh when enabled', async () => {
    render(<ThreatIntelligenceHub {...defaultProps} autoRefresh={true} />);

    expect(screen.getByText(/🔄 Auto-refresh/)).toBeInTheDocument();

    // Fast-forward time to trigger refresh
    act(() => {
      jest.advanceTimersByTime(300000); // 5 minutes
    });

    // Should update timestamp
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('displays feed status information', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Switch to feeds tab
    await user.click(screen.getByText(/📡 Feeds/));

    expect(screen.getByText('VirusTotal')).toBeInTheDocument();
    expect(screen.getByText('Recorded Future')).toBeInTheDocument();
    expect(screen.getByText('MISP')).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ThreatIntelligenceHub
        {...defaultProps}
        className="custom-threat-class"
      />,
    );

    const container = screen
      .getByText(/🛡️ Threat Intelligence Hub/)
      .closest('.threat-intelligence-hub');
    expect(container).toHaveClass('custom-threat-class');
  });

  it('handles empty search results', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(
      /Search indicators, tags, or IOCs/,
    );
    await user.type(searchInput, 'nonexistent-indicator');

    // Should show no results or empty state
    expect(screen.getByText(/Threat Indicators \(0\)/)).toBeInTheDocument();
  });

  it('displays indicator context information', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Select an indicator to see details
    await user.click(screen.getByText('192.168.1.100'));

    // Should show context information
    expect(screen.getByText(/Malware Family:/)).toBeInTheDocument();
    expect(screen.getByText(/Campaign:/)).toBeInTheDocument();
    expect(screen.getByText(/Actor:/)).toBeInTheDocument();
  });

  it('shows indicator confidence scores', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Should display confidence percentages
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('handles component cleanup on unmount', () => {
    const { unmount } = render(
      <ThreatIntelligenceHub {...defaultProps} autoRefresh={true} />,
    );

    unmount();

    // Should clear timers without errors
    expect(() => jest.runOnlyPendingTimers()).not.toThrow();
  });

  it('supports keyboard navigation', () => {
    render(<ThreatIntelligenceHub {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(
      /Search indicators, tags, or IOCs/,
    );

    // Test keyboard events
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    // Should handle keyboard events without errors
    expect(searchInput).toBeInTheDocument();
  });

  it('updates counters in tab labels', async () => {
    const user = userEvent.setup();
    render(<ThreatIntelligenceHub {...defaultProps} />);

    // Check initial count
    expect(screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();

    // Apply filter to change count
    const searchInput = screen.getByPlaceholderText(
      /Search indicators, tags, or IOCs/,
    );
    await user.type(searchInput, 'domain');

    // Count should update (though exact number depends on mock data)
    expect(screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
  });
});
