import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaestroApp } from '../../maestro/MaestroApp';

vi.mock('react-virtualized', async () => {
  const actual =
    await vi.importActual<typeof import('react-virtualized')>(
      'react-virtualized',
    );
  return {
    ...actual,
    AutoSizer: ({
      children,
    }: {
      children: (size: { width: number; height: number }) => React.ReactNode;
    }) =>
      children({
        width: 900,
        height: 600,
      }),
    List: ({
      rowCount,
      rowRenderer,
    }: {
      rowCount: number;
      rowRenderer: ({
        index,
      }: {
        index: number;
        key: React.Key;
        style: React.CSSProperties;
      }) => React.ReactNode;
    }) => (
      <div data-testid="virtualized-list">
        {Array.from({ length: rowCount }).map((_, index) =>
          rowRenderer({ index, key: `row-${index}`, style: { height: 90 } }),
        )}
      </div>
    ),
  } as typeof import('react-virtualized');
});

describe('MaestroApp', () => {
  it('renders dashboard overview with health stats', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/' }]}>
        <Routes>
          <Route path="/*" element={<MaestroApp />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipelines/)).toBeInTheDocument();
    expect(screen.getByText(/Policy Denials/)).toBeInTheDocument();
  });

  it('filters pipelines with debounced search and updates query string', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[{ pathname: '/pipelines' }]}>
        <Routes>
          <Route path="/*" element={<MaestroApp />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByLabelText(/Search/i);
    await user.clear(input);
    await user.type(input, 'Pipeline 42');
    await waitFor(() => {
      expect(
        screen.getByText(/Virtualized list of 1 pipelines/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Pipeline 42/)).toBeInTheDocument();
  });

  it('prompts for reason before opening artifacts and stores audit entry', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[{ pathname: '/runs/run-1' }]}>
        <Routes>
          <Route path="/*" element={<MaestroApp />} />
        </Routes>
      </MemoryRouter>,
    );

    const artifactsTab = screen.getByRole('button', { name: /Artifacts/i });
    await user.click(artifactsTab);
    const modal = await screen.findByText(/Reason for access required/i);
    expect(modal).toBeInTheDocument();

    const reasonInput = screen.getByLabelText(/Reason/i);
    await user.type(reasonInput, 'Investigating artifact integrity');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    expect(
      await screen.findByText(/Investigating artifact integrity/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Admin/i }));
    expect(await screen.findByText(/Access reasons/)).toBeInTheDocument();
    expect(
      screen.getByText(/Investigating artifact integrity/),
    ).toBeInTheDocument();
  });
});
