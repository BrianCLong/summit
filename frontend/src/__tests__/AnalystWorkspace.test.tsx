import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnalystWorkspace from '../components/AnalystWorkspace';

// Mock the adapter so we control what data loads
vi.mock('../services/analystAdapter', () => ({
  analystAdapter: {
    getCase: vi.fn(),
  },
}));

// Mock cytoscape to avoid DOM canvas errors in jsdom
vi.mock('cytoscape', () => {
  const cy = {
    on: vi.fn(),
    startBatch: vi.fn(),
    endBatch: vi.fn(),
    zoom: vi.fn().mockReturnValue(1),
    elements: vi.fn().mockReturnValue({
      addClass: vi.fn(),
      removeClass: vi.fn(),
    }),
    getElementById: vi.fn().mockReturnValue({
      position: vi.fn(),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    }),
    json: vi.fn().mockReturnValue({ elements: [] }),
    destroy: vi.fn(),
    removeListener: vi.fn(),
    fit: vi.fn(),
    nodes: vi.fn().mockReturnValue({ forEach: vi.fn() }),
  };
  const mockCytoscape = vi.fn().mockReturnValue(cy);
  (mockCytoscape as any).use = vi.fn();
  return { default: mockCytoscape };
});

vi.mock('cytoscape-cose-bilkent', () => ({ default: {} }));

const MOCK_CASE = {
  id: 'case-001',
  title: 'Operation Sandstorm',
  description: 'Test',
  entities: [
    {
      id: 'e-001',
      label: 'Viktor Morozov',
      type: 'person' as const,
      deception_score: 0.87,
      connections: ['e-002'],
      properties: { role: 'Coordinator' },
    },
    {
      id: 'e-002',
      label: 'Nexus Holdings',
      type: 'organization' as const,
      deception_score: 0.5,
      connections: ['e-001'],
      properties: {},
    },
  ],
  relationships: [
    {
      id: 'r-001',
      source: 'e-001',
      target: 'e-002',
      label: 'CONTROLS',
      weight: 0.9,
    },
  ],
  events: [
    {
      id: 'ev-001',
      timestamp: '2023-09-01T00:00:00Z',
      action: 'Campaign initiated',
      entityId: 'e-001',
      confidence: 0.91,
      result: 'confirmed',
      severity: 'critical' as const,
    },
  ],
  reports: [],
};

describe('AnalystWorkspace integration', () => {
  beforeEach(async () => {
    const { analystAdapter } = await import('../services/analystAdapter');
    (analystAdapter.getCase as ReturnType<typeof vi.fn>).mockResolvedValue(
      MOCK_CASE,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three-pane workspace shell', async () => {
    render(<AnalystWorkspace />);

    // Top bar — AnalystWorkspace renders its own header; use testid to be precise
    expect(screen.getByTestId('analyst-workspace')).toBeInTheDocument();
    // Left pane
    expect(
      screen.getByRole('complementary', { name: /entity explorer/i }),
    ).toBeInTheDocument();
    // Center pane
    expect(screen.getByRole('main', { name: /investigation canvas/i })).toBeInTheDocument();
    // Right pane
    expect(
      screen.getByRole('complementary', { name: /timeline and reports/i }),
    ).toBeInTheDocument();
  });

  it('shows loading state initially then populates entities', async () => {
    render(<AnalystWorkspace />);

    // Loading indicator text appears somewhere in the workspace
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    // Entities appear after data loads
    await waitFor(() => {
      expect(screen.getByText('Viktor Morozov')).toBeInTheDocument();
    });
    expect(screen.getByText('Nexus Holdings')).toBeInTheDocument();
  });

  it('shows entity count after load', async () => {
    render(<AnalystWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/2 of 2 entities/)).toBeInTheDocument();
    });
  });

  it('shows timeline events after load', async () => {
    render(<AnalystWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Campaign initiated')).toBeInTheDocument();
    });
  });

  it('shows case ID in topbar after load', async () => {
    render(<AnalystWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/case: case-001/i)).toBeInTheDocument();
    });
  });

  it('shows error indicator when adapter throws', async () => {
    const { analystAdapter } = await import('../services/analystAdapter');
    (analystAdapter.getCase as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network failure'),
    );

    render(<AnalystWorkspace />);

    await waitFor(() => {
      // The workspace topbar renders an error indicator with role=alert
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
