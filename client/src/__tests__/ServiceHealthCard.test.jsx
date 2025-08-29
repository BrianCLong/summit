import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ServiceHealthCard from '../components/dashboard/ServiceHealthCard';

describe('ServiceHealthCard', () => {
  afterEach(() => {
    if (global.fetch) global.fetch = undefined;
  });

  it('renders service statuses from /health', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 'OK',
          environment: 'test',
          services: { neo4j: 'connected', postgres: 'connected', redis: 'connected' },
        }),
    });

    render(<ServiceHealthCard />);
    expect(screen.getByText(/Service Health/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('OK')).toBeInTheDocument());
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getAllByText('connected').length).toBeGreaterThanOrEqual(1);
  });
});
