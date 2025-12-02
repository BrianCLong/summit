import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ICValuePropositionBanner from '../ICValuePropositionBanner';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ICValuePropositionBanner', () => {
  it('renders the platform name', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(
      screen.getByText('Intelligence Community Platform'),
    ).toBeInTheDocument();
  });

  it('displays the tagline', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(
      screen.getByText('ODNI-Aligned • Edge-First • Mission-Ready'),
    ).toBeInTheDocument();
  });

  it('shows RFI READY badge', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(screen.getByText('RFI READY')).toBeInTheDocument();
  });

  it('displays the 50% faster insights metric', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Faster Insights')).toBeInTheDocument();
    expect(screen.getByText('vs. legacy systems')).toBeInTheDocument();
  });

  it('displays the edge latency metric', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(screen.getByText('<100ms')).toBeInTheDocument();
    expect(screen.getByText('Edge Latency')).toBeInTheDocument();
    expect(screen.getByText('tactical deployment')).toBeInTheDocument();
  });

  it('displays the AI automation metric', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('AI Automation')).toBeInTheDocument();
    expect(screen.getByText('policy validation')).toBeInTheDocument();
  });

  it('displays the security model metric', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(screen.getByText('Zero-Trust')).toBeInTheDocument();
    expect(screen.getByText('Security Model')).toBeInTheDocument();
    expect(screen.getByText('RBAC + ABAC + OPA')).toBeInTheDocument();
  });

  it('renders all compliance tags', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    expect(screen.getByText('ICD 503 Aligned')).toBeInTheDocument();
    expect(screen.getByText('FedRAMP Ready')).toBeInTheDocument();
    expect(screen.getByText('JWICS Compatible')).toBeInTheDocument();
    expect(screen.getByText('SIPRNet Tested')).toBeInTheDocument();
    expect(screen.getByText('Air-Gap Capable')).toBeInTheDocument();
    expect(screen.getByText('STIX/TAXII Native')).toBeInTheDocument();
  });

  it('renders as a card component', () => {
    renderWithTheme(<ICValuePropositionBanner />);
    const card = screen
      .getByText('Intelligence Community Platform')
      .closest('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });
});
