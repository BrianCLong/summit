import React from 'react';
import { render, screen } from '@testing-library/react';
import EdgeFirstMetricsWidget from '../EdgeFirstMetricsWidget';

describe('EdgeFirstMetricsWidget', () => {
  it('renders the widget title', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('Edge-First Deployment')).toBeInTheDocument();
  });

  it('displays the offline capable chip', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('Offline Capable')).toBeInTheDocument();
  });

  it('displays latency target met chip when p95 is under 100ms', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('<100ms Target Met')).toBeInTheDocument();
  });

  it('renders latency metrics section', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('Avg Latency')).toBeInTheDocument();
    expect(screen.getByText('P95 Latency')).toBeInTheDocument();
    expect(screen.getByText('P99 Latency')).toBeInTheDocument();
  });

  it('displays edge node availability section', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('Edge Node Availability')).toBeInTheDocument();
  });

  it('renders deployed edge nodes list', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('Deployed Edge Nodes')).toBeInTheDocument();
  });

  it('displays all mock edge nodes', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('CONUS-Primary')).toBeInTheDocument();
    expect(screen.getByText('EUCOM-Alpha')).toBeInTheDocument();
    expect(screen.getByText('INDOPACOM-Bravo')).toBeInTheDocument();
    expect(screen.getByText('Tactical-FOB-7')).toBeInTheDocument();
  });

  it('shows node locations', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText(/Fort Meade, MD/)).toBeInTheDocument();
    expect(screen.getByText(/Stuttgart, DE/)).toBeInTheDocument();
  });

  it('displays node status chips', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getAllByText('ONLINE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SYNCING')).toBeInTheDocument();
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('shows pending sync count for nodes with pending operations', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('5 pending')).toBeInTheDocument();
    expect(screen.getByText('12 pending')).toBeInTheDocument();
  });

  it('displays sync status message when operations are pending', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(
      screen.getByText(/sync operations pending across offline nodes/i),
    ).toBeInTheDocument();
  });

  it('shows latency values for online nodes', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('12ms')).toBeInTheDocument();
    expect(screen.getByText('67ms')).toBeInTheDocument();
    expect(screen.getByText('89ms')).toBeInTheDocument();
  });

  it('displays the p95 latency target', () => {
    render(<EdgeFirstMetricsWidget />);
    expect(screen.getByText('Target: <100ms')).toBeInTheDocument();
  });
});
