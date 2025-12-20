import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RunSearch from '../RunSearch';
import { useAuthorization } from '../../../auth/withAuthorization';

jest.mock('../../../auth/withAuthorization');

const mockedUseAuthorization = useAuthorization as jest.Mock;
const originalFetch = global.fetch;

describe('RunSearch', () => {
  beforeEach(() => {
    mockedUseAuthorization.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('issues a tenant-scoped search when authorized', async () => {
    mockedUseAuthorization.mockReturnValue({
      canAccess: jest.fn().mockReturnValue(true),
      getTenantForAction: jest.fn((_action: string, requested: string) => requested || 'tenant-scope'),
      tenantId: 'tenant-scope',
    });

    const mockFetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: { searchRuns: [] } }),
      }),
    );
    global.fetch = mockFetch as any;

    render(<RunSearch />);

    fireEvent.click(screen.getByTestId('run-search-submit'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
    expect(body.query).toContain('"tenant":"tenant-scope"');
  });

  it('blocks search and shows message when unauthorized', async () => {
    mockedUseAuthorization.mockReturnValue({
      canAccess: jest.fn().mockReturnValue(false),
      getTenantForAction: jest.fn(() => 'tenant-scope'),
      tenantId: 'tenant-scope',
    });

    const mockFetch = jest.fn();
    global.fetch = mockFetch as any;

    render(<RunSearch />);

    fireEvent.click(screen.getByTestId('run-search-submit'));

    expect(screen.getByTestId('run-search-denied')).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).not.toHaveBeenCalled());
  });
});
