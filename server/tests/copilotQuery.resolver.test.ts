import { copilotResolvers } from '../src/graphql/resolvers.copilot.js';
import { jest, describe, it, expect } from '@jest/globals';

describe('copilot resolvers', () => {
  it('returns run info for copilotRun', async () => {
    const getRunInfo = jest.fn(
      () => Promise.resolve({ id: 'run-1' }),
    ) as jest.MockedFunction<(id: string) => Promise<{ id: string }>>;
    const dataSources = {
      copilotOrchestrator: {
        getRunInfo,
      },
    };

    const res = await copilotResolvers.Query.copilotRun(
      null,
      { id: 'run-1' },
      { dataSources },
    );

    expect(getRunInfo).toHaveBeenCalledWith('run-1');
    expect(res).toEqual({ id: 'run-1' });
  });

  it('returns events for copilotEvents', async () => {
    const dataSources = {
      copilotOrchestrator: {
        store: {
          getRun: jest.fn(
            () => Promise.resolve({ id: 'run-2' }),
          ) as jest.MockedFunction<(runId: string) => Promise<{ id: string }>>,
          listEvents: jest.fn(
            () => Promise.resolve([{ id: 'evt-1' }]),
          ) as jest.MockedFunction<
            (runId: string, opts: { afterId: string | null; limit: number }) => Promise<Array<{ id: string }>>
          >,
        },
      },
    };

    const res = await copilotResolvers.Query.copilotEvents(
      null,
      { runId: 'run-2', afterId: null, limit: 10 },
      { dataSources },
    );

    expect(dataSources.copilotOrchestrator.store.getRun).toHaveBeenCalledWith('run-2');
    expect(dataSources.copilotOrchestrator.store.listEvents).toHaveBeenCalledWith('run-2', {
      afterId: null,
      limit: 10,
    });
    expect(res).toEqual([{ id: 'evt-1' }]);
  });
});
