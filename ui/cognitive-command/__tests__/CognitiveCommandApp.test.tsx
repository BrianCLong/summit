import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CognitiveCommandApp } from '../CognitiveCommandApp';

// Mock lazy-loaded components
vi.mock('../foresight/StrategicForesightDashboard', () => ({
  default: () => <div data-testid="foresight-dashboard">Foresight Dashboard</div>,
}));
vi.mock('../world-model/WorldStateMap', () => ({
  default: () => <div data-testid="world-state-map">World State Map</div>,
}));
vi.mock('../narrative-battlespace/NarrativeBattlespaceMap', () => ({
  default: () => <div data-testid="narrative-map">Narrative Map</div>,
}));
vi.mock('../decision-sim/DecisionWorkbench', () => ({
  default: () => <div data-testid="decision-workbench">Decision Workbench</div>,
}));
vi.mock('../autonomy/AutonomySupervisor', () => ({
  default: () => <div data-testid="autonomy-supervisor">Autonomy Supervisor</div>,
}));
vi.mock('../missions/MissionCommandCenter', () => ({
  default: () => <div data-testid="mission-command">Mission Command</div>,
}));
vi.mock('../governance/StrategicGovernancePanel', () => ({
  default: () => <div data-testid="governance-panel">Governance Panel</div>,
}));
vi.mock('../insight-feed/CognitiveInsightFeed', () => ({
  default: () => <div data-testid="insight-feed">Insight Feed</div>,
}));

describe('CognitiveCommandApp', () => {
  it('renders the command center shell', async () => {
    render(<CognitiveCommandApp />);
    expect(screen.getByText('SUMMIT')).toBeDefined();
    expect(screen.getByText('Cognitive Command Center')).toBeDefined();
  });

  it('renders the strategic status bar', async () => {
    render(<CognitiveCommandApp />);
    expect(screen.getByText('MODE:')).toBeDefined();
    expect(screen.getByText('Command')).toBeDefined();
  });

  it('renders the global mission rail with all modes', async () => {
    render(<CognitiveCommandApp />);
    expect(screen.getByText('OBS')).toBeDefined();
    expect(screen.getByText('INV')).toBeDefined();
    expect(screen.getByText('FCT')).toBeDefined();
    expect(screen.getByText('SIM')).toBeDefined();
    expect(screen.getByText('INT')).toBeDefined();
    expect(screen.getByText('GOV')).toBeDefined();
  });

  it('defaults to observe mode', () => {
    render(<CognitiveCommandApp />);
    expect(screen.getByText('observe')).toBeDefined();
  });
});
