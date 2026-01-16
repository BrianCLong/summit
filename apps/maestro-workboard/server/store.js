import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const STATUS_ORDER = [
  'Backlog',
  'Ready',
  'Running',
  'Needs Review',
  'Done',
  'Blocked',
];

const DEFAULT_DATA = {
  workItems: [],
  runs: [],
};

const createSeed = () => {
  const now = new Date().toISOString();
  return {
    workItems: [
      {
        id: randomUUID(),
        title: 'Maestro Workboard MVP',
        description: 'Seed card to demonstrate plan → implement → validate.',
        status: 'Backlog',
        createdAt: now,
        updatedAt: now,
        dependencies: [],
        acceptanceCriteria: [
          'Board renders columns with cards',
          'Run emits events and evidence bundle',
        ],
        skills: ['planner', 'runner', 'evidence-bundler'],
      },
      {
        id: randomUUID(),
        title: 'Policy gate validation',
        description: 'Confirm capability profile enforcement is logged.',
        status: 'Ready',
        createdAt: now,
        updatedAt: now,
        dependencies: [],
        acceptanceCriteria: ['Capability profile is stored in provenance'],
        skills: ['policy'],
      },
    ],
    runs: [],
  };
};

export const createStore = ({ dataDir }) => {
  const emitter = new EventEmitter();
  const dataPath = path.join(dataDir, 'maestro-workboard.json');
  const state = { ...DEFAULT_DATA };
  let writeQueue = Promise.resolve();

  const persist = () => {
    writeQueue = writeQueue.then(async () => {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(dataPath, JSON.stringify(state, null, 2));
    });
    return writeQueue;
  };

  const load = async () => {
    try {
      const raw = await fs.readFile(dataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      state.workItems = parsed.workItems ?? [];
      state.runs = parsed.runs ?? [];
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      const seed = createSeed();
      state.workItems = seed.workItems;
      state.runs = seed.runs;
      await persist();
    }
  };

  const listWorkItems = () => state.workItems;

  const getWorkItem = (id) => state.workItems.find((item) => item.id === id);

  const createWorkItem = async (payload) => {
    const now = new Date().toISOString();
    const item = {
      id: randomUUID(),
      title: payload.title ?? 'Untitled',
      description: payload.description ?? '',
      status: STATUS_ORDER.includes(payload.status)
        ? payload.status
        : 'Backlog',
      createdAt: now,
      updatedAt: now,
      dependencies: payload.dependencies ?? [],
      acceptanceCriteria: payload.acceptanceCriteria ?? [],
      skills: payload.skills ?? [],
    };
    state.workItems.push(item);
    await persist();
    return item;
  };

  const updateWorkItem = async (id, updates) => {
    const item = getWorkItem(id);
    if (!item) {
      return null;
    }
    const next = {
      ...item,
      ...updates,
      status: updates.status && STATUS_ORDER.includes(updates.status)
        ? updates.status
        : item.status,
      dependencies: updates.dependencies ?? item.dependencies,
      acceptanceCriteria: updates.acceptanceCriteria ?? item.acceptanceCriteria,
      skills: updates.skills ?? item.skills,
      updatedAt: new Date().toISOString(),
    };
    const idx = state.workItems.findIndex((entry) => entry.id === id);
    state.workItems[idx] = next;
    await persist();
    return next;
  };

  const createRun = async (workItemId, payload) => {
    const now = new Date().toISOString();
    const run = {
      id: randomUUID(),
      workItemId,
      status: 'running',
      capabilityProfile: payload.capabilityProfile,
      waiverId: payload.waiverId ?? null,
      createdAt: now,
      startedAt: now,
      endedAt: null,
      evidence: {},
      events: [],
      worktreePath: payload.worktreePath,
    };
    state.runs.push(run);
    await persist();
    return run;
  };

  const updateRun = async (runId, updates) => {
    const run = state.runs.find((entry) => entry.id === runId);
    if (!run) {
      return null;
    }
    Object.assign(run, updates);
    await persist();
    return run;
  };

  const getRun = (id) => state.runs.find((entry) => entry.id === id);

  const listRunsForWorkItem = (workItemId) =>
    state.runs.filter((entry) => entry.workItemId === workItemId);

  const addEvent = async (runId, event) => {
    const run = getRun(runId);
    if (!run) {
      return null;
    }
    const nextEvent = {
      ...event,
      id: randomUUID(),
      runId,
      timestamp: new Date().toISOString(),
    };
    run.events.push(nextEvent);
    await persist();
    emitter.emit(`run:${runId}`, nextEvent);
    return nextEvent;
  };

  const listEvents = (runId) => {
    const run = getRun(runId);
    return run ? run.events : [];
  };

  const subscribe = (runId, handler) => {
    const channel = `run:${runId}`;
    emitter.on(channel, handler);
    return () => emitter.off(channel, handler);
  };

  return {
    load,
    listWorkItems,
    getWorkItem,
    createWorkItem,
    updateWorkItem,
    createRun,
    updateRun,
    getRun,
    listRunsForWorkItem,
    addEvent,
    listEvents,
    subscribe,
  };
};
