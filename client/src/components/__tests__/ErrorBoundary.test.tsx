import React from 'react';
import { render, waitFor } from '@testing-library/react';

import ErrorBoundary from '../ErrorBoundary.tsx';

describe('ErrorBoundary telemetry routing', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('posts telemetry to monitoring endpoint with tenant context', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchSpy as any;
    localStorage.setItem('tenantId', 'tenant-42');

    const Boom = () => {
      throw new Error('boom');
    };

    render(
      <ErrorBoundary componentName="TestComponent">
        <Boom />
      </ErrorBoundary>,
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(fetchSpy).toHaveBeenCalledWith(
      '/monitoring/telemetry/events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-tenant-id': 'tenant-42' }),
      }),
    );
  });
});
