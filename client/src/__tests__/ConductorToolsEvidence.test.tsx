import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConductorStudio from '../features/conductor/ConductorStudio';

describe('Conductor Tools & Evidence panel', () => {
  const origFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/maestro/v1/runs/demo-run/mcp/sessions')) {
        return new Response(
          JSON.stringify([
            {
              sid: 's-1',
              scopes: ['mcp:invoke'],
              servers: ['graphops'],
              createdAt: Date.now(),
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ) as any;
      }
      if (url.includes('/api/maestro/v1/runs/demo-run/mcp/invocations')) {
        return new Response(
          JSON.stringify([
            {
              id: 'a-1',
              createdAt: new Date().toISOString(),
              details: { argsHash: 'aa', resultHash: 'bb' },
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ) as any;
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    }) as any;
  });
  afterEach(() => {
    global.fetch = origFetch as any;
  });

  it('renders attached sessions and invocations when tab selected', async () => {
    render(
      <MemoryRouter>
        <ConductorStudio />
      </MemoryRouter>,
    );

    const tab = screen.getByRole('tab', { name: /Tools & Evidence/i });
    fireEvent.click(tab);

    expect(
      await screen.findByText(/Attached MCP Sessions/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Tool Invocations/)).toBeInTheDocument();
    });
  });
});
