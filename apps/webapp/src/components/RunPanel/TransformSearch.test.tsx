import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransformSearch } from './TransformSearch';

global.fetch = vi.fn();

const mockTransforms = [
  {
    id: 'TRANS-001',
    name: 'To IP Address',
    description: 'Resolves a domain to an IP address.',
    inputTypes: ['Domain'],
    outputTypes: ['IPv4Address'],
  },
  {
    id: 'TRANS-002',
    name: 'To DNS Name',
    description: 'Resolves an IP address to a DNS name.',
    inputTypes: ['IPv4Address'],
    outputTypes: ['Domain'],
  },
];

describe('TransformSearch', () => {
  beforeEach(() => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ transforms: mockTransforms }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search input and initial transforms', async () => {
    render(<TransformSearch />);

    // Expect loading state first if needed, but waitFor handles async appearance
    await waitFor(() => {
        expect(screen.getByText('Run Transforms')).toBeInTheDocument();
    });

    expect(screen.getByTestId('transform-search-input')).toBeInTheDocument();

    // Check for mock data
    expect(screen.getByText('To IP Address')).toBeInTheDocument();
    expect(screen.getByText('To DNS Name')).toBeInTheDocument();
  });

  it('filters transforms based on search query', async () => {
    render(<TransformSearch />);

    await waitFor(() => {
        expect(screen.getByText('To IP Address')).toBeInTheDocument();
    });

    const input = screen.getByTestId('transform-search-input');

    // Search for "DNS"
    fireEvent.change(input, { target: { value: 'DNS' } });

    expect(screen.queryByText('To IP Address')).not.toBeInTheDocument();
    expect(screen.getByText('To DNS Name')).toBeInTheDocument();
  });

  it('shows error on fetch fail', async () => {
    (global.fetch as any).mockResolvedValue({
        ok: false,
    });

    render(<TransformSearch />);

    await waitFor(() => {
        expect(screen.getByText('Error loading transforms')).toBeInTheDocument();
    });
  });
});
