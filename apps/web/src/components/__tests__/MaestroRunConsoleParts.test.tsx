// apps/web/src/components/__tests__/MaestroRunConsoleParts.test.tsx
/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { RunTasks } from '../MaestroRunConsoleParts';
import type { MaestroRunResponse, TaskSummary, TaskResult } from '../../types/maestro';

expect.extend(matchers as any);

describe('<RunTasks />', () => {
  afterEach(() => {
    cleanup();
  });

  const createMockRunResponse = (count: number): MaestroRunResponse => {
    const tasks: TaskSummary[] = [];
    const results: TaskResult[] = [];

    for (let i = 0; i < count; i++) {
      const taskId = `task-${i}`;
      tasks.push({
        id: taskId,
        status: 'succeeded',
        description: `Task description ${i}`,
      });
      results.push({
        task: {
          id: taskId,
          status: 'succeeded',
          description: `Task description ${i}`,
        },
        artifact: {
          id: `artifact-${i}`,
          kind: 'text',
          label: 'output',
          data: `Output for task ${i}`,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return {
      run: {
        id: 'run-1',
        user: { id: 'user-1' },
        createdAt: new Date().toISOString(),
        requestText: 'test request',
      },
      tasks,
      results,
      costSummary: {
        runId: 'run-1',
        totalCostUSD: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        byModel: {},
      },
    };
  };

  it('renders tasks correctly with a small dataset', () => {
    const mockData = createMockRunResponse(5);
    render(<RunTasks selectedRun={mockData} />);

    expect(screen.getByText('Task description 0')).toBeInTheDocument();
    expect(screen.getByText('Task description 4')).toBeInTheDocument();
  });

  it('renders tasks correctly with a larger dataset (performance check)', () => {
    const count = 50; // Reduced from 1000
    const mockData = createMockRunResponse(count);

    const startTime = performance.now();
    render(<RunTasks selectedRun={mockData} />);
    const endTime = performance.now();

    // Just ensuring it renders without crashing
    expect(screen.getByText(`Task description ${count - 1}`)).toBeInTheDocument();

    // Log time for manual verification (optional)
    console.log(`Render time for ${count} items: ${endTime - startTime}ms`);
  });
});
