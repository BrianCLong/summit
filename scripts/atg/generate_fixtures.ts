import fs from 'fs';
import path from 'path';
import { generateEvidenceId } from '../../src/graphrag/atg/evidence.js';
import { EsgSnapshot, EsgNode, EsgEdge } from '../../src/graphrag/atg/esg/schema.js';
import { ESG_NODE_WEIGHTS, ESG_EDGE_WEIGHTS } from '../../src/graphrag/atg/esg/weights.js';
import { TecfEvent } from '../../src/graphrag/atg/tecf.js';

const OUT_DIR = 'out';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR);
}

// Generate TECF Fixtures
const tecfEvents: TecfEvent[] = [
  {
    id: 'evt-1',
    type: 'saas_login',
    timestamp: '2025-09-15T10:00:00Z',
    source: 'okta',
    payload: { user: 'jdoe', result: 'success' }
  },
  {
    id: 'evt-2',
    type: 'repo_access',
    timestamp: '2025-09-15T10:05:00Z',
    source: 'github',
    payload: { user: 'jdoe', repo: 'summit-core' }
  }
].map(evt => ({
  ...evt,
  evidence_id: generateEvidenceId(evt)
}));

// Use JSON.stringify for ndjson
fs.writeFileSync(path.join(OUT_DIR, 'tecf.ndjson'), tecfEvents.map(e => JSON.stringify(e)).join('\n'));

// Generate ESG Snapshot Fixture
const node1: EsgNode = {
  tenant_id: 't1',
  id: 'n1',
  type: 'IdentityNode',
  weight: ESG_NODE_WEIGHTS.IdentityNode,
  attrs: { username: 'jdoe' },
  evidence_ids: [tecfEvents[0].evidence_id!],
  t_first: '2025-09-15T10:00:00Z',
  t_last: '2025-09-15T10:00:00Z'
};

const node2: EsgNode = {
  tenant_id: 't1',
  id: 'n2',
  type: 'RepoNode',
  weight: ESG_NODE_WEIGHTS.RepoNode,
  attrs: { name: 'summit-core' },
  evidence_ids: [tecfEvents[1].evidence_id!],
  t_first: '2025-09-15T10:05:00Z',
  t_last: '2025-09-15T10:05:00Z'
};

const edge1: EsgEdge = {
  tenant_id: 't1',
  id: 'e1',
  source: 'n1',
  target: 'n2',
  type: 'AccessEdge',
  weight: ESG_EDGE_WEIGHTS.AccessEdge,
  attrs: { permission: 'write' },
  evidence_ids: [tecfEvents[1].evidence_id!],
  t_first: '2025-09-15T10:05:00Z',
  t_last: '2025-09-15T10:05:00Z'
};

const snapshot: EsgSnapshot = {
  tenant_id: 't1',
  generated_at: new Date().toISOString(),
  valid_from: '2025-09-15T00:00:00Z',
  valid_to: '2025-09-15T23:59:59Z',
  nodes: [node1, node2],
  edges: [edge1]
};

fs.writeFileSync(path.join(OUT_DIR, 'esg.snapshot.json'), JSON.stringify(snapshot, null, 2));

console.log('Fixtures generated in out/');
