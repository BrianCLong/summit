import { crystalOrchestrator } from '../crystal/session-orchestrator.js';
import type { StartRunInput } from '../crystal/types.js';

interface StartRunArgs {
  input: {
    sessionId: string;
    runDefinitionId: string;
    commandOverride?: string;
    timeoutMs?: number;
    environment?: Record<string, string>;
  };
}

function toStartRunInput(args: StartRunArgs['input']): StartRunInput {
  const overrides: StartRunInput['overrides'] = {};
  if (args.commandOverride) {
    overrides.command = args.commandOverride;
  }
  if (typeof args.timeoutMs === 'number') {
    overrides.timeoutMs = args.timeoutMs;
  }
  if (args.environment) {
    overrides.environment = args.environment;
  }
  return {
    sessionId: args.sessionId,
    runDefinitionId: args.runDefinitionId,
    overrides: Object.keys(overrides).length ? overrides : undefined,
  };
}

function createRunLogAsyncIterator(sessionId: string, runId: string) {
  const queue: any[] = [];
  const listeners: Array<(value: IteratorResult<any>) => void> = [];
  const unsubscribe = crystalOrchestrator.subscribeToRunLogs(
    sessionId,
    runId,
    (event) => {
      if (listeners.length) {
        const resolve = listeners.shift();
        resolve?.({ value: event, done: false });
      } else {
        queue.push(event);
      }
    },
  );

  return {
    async next(): Promise<IteratorResult<any>> {
      if (queue.length) {
        return { value: queue.shift(), done: false };
      }
      return new Promise((resolve) => {
        listeners.push(resolve);
      });
    },
    async return(): Promise<IteratorResult<any>> {
      unsubscribe();
      return { value: undefined, done: true };
    },
    async throw(error: unknown): Promise<IteratorResult<any>> {
      unsubscribe();
      throw error;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

export const Query = {
  crystalSessions: () => crystalOrchestrator.listSessions(),
  crystalSession: (_: unknown, { id }: { id: string }) =>
    crystalOrchestrator.getSession(id),
  crystalAdapters: () => crystalOrchestrator.getAdapters(),
  crystalBudgets: () => crystalOrchestrator.getCostSnapshot().budgets,
};

export const Mutation = {
  createCrystalSession: (_: unknown, { input }: { input: any }) =>
    crystalOrchestrator.createSession(input),
  startCrystalRun: (_: unknown, { input }: StartRunArgs) =>
    crystalOrchestrator.startRun(toStartRunInput(input)),
  recordCrystalMessage: (_: unknown, { input }: { input: any }) =>
    crystalOrchestrator.recordMessage(input),
  updateCrystalPanels: (_: unknown, { input }: { input: any }) =>
    crystalOrchestrator.updatePanels(input),
  closeCrystalSession: (_: unknown, { sessionId }: { sessionId: string }) =>
    crystalOrchestrator.closeSession({ sessionId }),
};

export const Subscription = {
  crystalRunLogs: {
    subscribe: (_: unknown, args: { sessionId: string; runId: string }) =>
      createRunLogAsyncIterator(args.sessionId, args.runId),
  },
};

export const CrystalResolvers = {
  Query,
  Mutation,
  Subscription,
};

export default CrystalResolvers;
