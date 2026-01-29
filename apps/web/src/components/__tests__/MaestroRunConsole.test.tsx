/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// apps/web/src/components/__tests__/MaestroRunConsole.test.tsx
/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { MaestroRunConsole } from '../MaestroRunConsole';

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

  it.skip('renders quick prompts and runs Maestro pipeline on submit', async () => {
    render(<MaestroRunConsole userId="user-123" />);

    expect(
      screen.getByText(/Maestro Run Console/i),
    ).toBeInTheDocument();

    // Verify quick prompts
    expect(screen.getByText('Try:')).toBeInTheDocument();
    expect(
      screen.getByText('Analyze the last 3 PRs for security risks'),
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
    // The component displays it with 4 decimals (appears twice: total and per-model)
    expect(screen.getAllByText(/\$0.0012/)[0]).toBeInTheDocument();

    // Task description & artifact output
    const descriptions = screen.getAllByText('Execute user request: test request');
    expect(descriptions.length).toBeGreaterThan(0);
    expect(descriptions[0]).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('copies artifact to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<MaestroRunConsole userId="user-123" />);

    const textarea = screen.getByPlaceholderText(/describe what you want/i);
    fireEvent.change(textarea, { target: { value: 'test request' } });
    fireEvent.click(screen.getByRole('button', { name: /run with maestro/i }));

    await waitFor(() =>
      expect(screen.getByText('hello world')).toBeInTheDocument(),
    );

    // The copy button is initially hidden/opacity 0 but present in DOM
    const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
    expect(copyButton).toBeInTheDocument();

    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('hello world');

    // Check for success state (aria-label changes)
    await waitFor(() => {
        expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();
    });
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
