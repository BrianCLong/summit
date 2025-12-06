import { Agent, SystemStatus } from './types';

export const agents: Agent[] = [
  { id: 'maestro', name: 'Maestro Conductor', tags: ['router', 'exec'] },
  { id: 'codex', name: 'CodeGen Codex', tags: ['dev', 'test'] },
  { id: 'sentinel', name: 'Sentinel CI', tags: ['sec', 'policy'] },
  { id: 'scribe', name: 'Scribe', tags: ['notes', 'transcribe'] },
];

export const systemStatus: SystemStatus[] = [
  {
    id: 'agents',
    title: 'AI Agents',
    metric: '4/4 Online',
    desc: 'All agents operational',
    docsLink: '/docs/agents',
    logsLink: '/logs/agents',
    actions: [{ id: 'ping-agents', label: 'Ping All' }],
  },
  {
    id: 'ingest',
    title: 'Data Ingest',
    metric: '98%',
    desc: 'Success rate (24h)',
    docsLink: '/docs/ingest',
    logsLink: '/logs/ingest',
    actions: [{ id: 're-sync-ingest', label: 'Re-trigger Sync' }],
  },
  {
    id: 'ci',
    title: 'CI/CD',
    metric: 'Healthy',
    desc: 'Main branch green',
    docsLink: '/docs/ci',
    logsLink: '/logs/ci',
    actions: [],
  },
  {
    id: 'queues',
    title: 'Queues',
    metric: '12',
    desc: 'Messages in queue',
    docsLink: '/docs/queues',
    logsLink: '/logs/queues',
    actions: [{ id: 'clear-queues', label: 'Clear Queues' }],
  },
];
