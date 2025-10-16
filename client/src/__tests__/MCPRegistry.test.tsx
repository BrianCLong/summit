import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MCPRegistry from '../pages/MCPRegistry';

describe('MCPRegistry page', () => {
  const origFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo) => {
      if (
        typeof input === 'string' &&
        input.endsWith('/api/maestro/v1/mcp/servers')
      ) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }) as any;
      }
      return new Response('Not Found', { status: 404 }) as any;
    }) as any;
  });
  afterEach(() => {
    global.fetch = origFetch as any;
  });

  it('renders registry heading and empty state', async () => {
    render(
      <MemoryRouter>
        <MCPRegistry />
      </MemoryRouter>,
    );

    expect(screen.getByText(/MCP Server Registry/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/No servers yet/i)).toBeInTheDocument();
    });
  });
});
