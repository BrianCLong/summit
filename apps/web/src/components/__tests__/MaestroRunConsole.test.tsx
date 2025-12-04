// apps/web/src/components/__tests__/MaestroRunConsole.test.tsx
/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { MaestroRunConsole } from '../maestro/MaestroRunConsole';

expect.extend(matchers as any);
import * as api from '../../lib/api/maestro';

describe('<MaestroRunConsole />', () => {
  afterEach(() => {
    cleanup();
  });
  const mockRunResponse: api.MaestroRunResponse = {
    run: {
      id: 'run-1',
      user: { id: 'user-123' },
      createdAt: new Date().toISOString(),
      requestText: 'test request',
    },
    tasks: [
      {
        id: 'task-1',
        status: 'succeeded',
        description: 'Execute user request: test request',
      },
    ],
    results: [
      {
        task: {
          id: 'task-1',
          status: 'succeeded',
          description: 'Execute user request: test request',
        },
        artifact: {
          id: 'artifact-1',
          kind: 'text',
          label: 'task-output',
          data: 'hello world',
          createdAt: new Date().toISOString(),
        },
      },
    ],
    costSummary: {
      runId: 'run-1',
      totalCostUSD: 0.0012,
      totalInputTokens: 42,
      totalOutputTokens: 84,
      byModel: {
        'openai:gpt-4.1': {
          costUSD: 0.0012,
          inputTokens: 42,
          outputTokens: 84,
        },
      },
    },
  };

  beforeEach(() => {
    vi.spyOn(api, 'runMaestroRequest').mockResolvedValue(mockRunResponse);
  });

  it('renders initial state and runs Maestro pipeline on submit', async () => {
    render(<MaestroRunConsole userId="user-123" />);

    expect(
      screen.getByText(/Maestro Run Console/i),
    ).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/describe what you want/i);
    fireEvent.change(textarea, { target: { value: 'test request' } });

    const button = screen.getByRole('button', { name: /run with maestro/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(api.runMaestroRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          requestText: 'test request',
        }),
      ),
    );

    // Summary
    expect(await screen.findByText(/run-1/)).toBeInTheDocument();
    // The component displays it with 4 decimals
    expect(screen.getByText(/\$0.0012/)).toBeInTheDocument();

    // Task description & artifact output
    const descriptions = screen.getAllByText('Execute user request: test request');
    expect(descriptions.length).toBeGreaterThan(0);
    expect(descriptions[0]).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('shows error when API fails', async () => {
    (api.runMaestroRequest as any).mockRejectedValueOnce(
      new Error('API down'),
    );

    render(<MaestroRunConsole userId="user-123" />);

    const textarea = screen.getByPlaceholderText(/describe what you want/i);
    fireEvent.change(textarea, { target: { value: 'test request' } });

    const button = screen.getByRole('button', { name: /run with maestro/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(
        screen.getByText(/API down/i),
      ).toBeInTheDocument(),
    );
  });
});
