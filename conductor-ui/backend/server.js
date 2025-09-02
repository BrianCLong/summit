const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const API_BASE = '/api/maestro/v1';

app.use(cors());
app.use(bodyParser.json());

// Helper function to run shell commands
const runShellCommand = (command, callback) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
        callback(code, stdout, stderr);
    });
};

// Endpoint to get status from tools/status_json.py
app.get('/api/status', (req, res) => {
    const scriptPath = path.join(__dirname, '../../tools/status_json.py');
    const python = spawn('python3', [scriptPath]);

    let dataToSend = '';
    python.stdout.on('data', (data) => {
        dataToSend += data.toString();
    });

    python.stderr.on('data', (data) => {
        console.error(`stderr from status_json.py: ${data}`);
    });

    python.on('close', (code) => {
        if (code === 0) {
            const statusFilePath = path.join(__dirname, '../../dashboard/status.json');
            fs.readFile(statusFilePath, 'utf8', (err, data) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to read status.json', details: err.message });
                } else {
                    try {
                        const status = JSON.parse(data);
                        res.json(status);
                    } catch (parseError) {
                        res.status(500).json({ error: 'Failed to parse status.json', details: parseError.message });
                    }
                }
            });
        } else {
            res.status(500).json({ error: 'Failed to run status_json.py', details: dataToSend });
        }
    });
});

// Endpoint to run just commands
app.post('/api/run-just-command', (req, res) => {
    const { justfile, target, args } = req.body;
    if (!justfile || !target) {
        return res.status(400).json({ error: 'justfile and target are required' });
    }

    const command = `just --justfile ${path.join(__dirname, '../../', justfile)} ${target} ${args || ''}`;
    console.log(`Executing command: ${command}`);

    runShellCommand(command, (code, stdout, stderr) => {
        if (code === 0) {
            res.json({ success: true, stdout, stderr });
        } else {
            res.status(500).json({ success: false, stdout, stderr, code });
        }
    });
});

// New endpoint to get conductor process status
app.get('/api/conductor-status', (req, res) => {
    const scriptPath = path.join(__dirname, '../../start-conductor.sh');
    runShellCommand(`${scriptPath} status`, (code, stdout, stderr) => {
        if (code === 0) {
            const statusLines = stdout.trim().split('\n');
            const backendStatus = statusLines.find(line => line.includes('Backend:')) || 'Backend: UNKNOWN';
            const frontendStatus = statusLines.find(line => line.includes('Frontend:')) || 'Frontend: UNKNOWN';
            res.json({
                backend: backendStatus.replace('Backend: ', '').trim(),
                frontend: frontendStatus.replace('Frontend: ', '').trim()
            });
        } else {
            res.status(500).json({ error: 'Failed to get conductor status', details: stderr });
        }
    });
});

// New endpoint to stop conductor processes
app.post('/api/conductor-stop', (req, res) => {
    const scriptPath = path.join(__dirname, '../../start-conductor.sh');
    runShellCommand(`${scriptPath} stop`, (code, stdout, stderr) => {
        if (code === 0) {
            res.json({ success: true, stdout, stderr });
        } else {
            res.status(500).json({ success: false, stdout, stderr, code });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

// --------------------------- In-memory Maestro API (dev stub) ---------------------------
// This section exposes minimal REST endpoints to unblock the Maestro UI end-to-end.
// It is safe for local development and does not persist state.

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const nowISO = () => new Date().toISOString();

const db = {
  budgets: { cap: 5000, utilization: 42 },
  runs: [],
  pipelines: [
    { id: 'pl_1', name: 'Build IntelGraph', version: '1.0.0', owner: 'alice', yaml: 'steps:\n  - build\n  - test\n  - package' },
    { id: 'pl_2', name: 'Run Tests', version: '1.2.0', owner: 'bob', yaml: 'steps:\n  - test' },
  ],
  secrets: [
    { id: 'sec_aws_kms', ref: 'kms/aws/prod/master', provider: 'AWS KMS', lastAccess: nowISO(), rotationDue: '2025-12-31' },
    { id: 'sec_vault_llm', ref: 'kv/maestro/providers/litellm', provider: 'Vault', lastAccess: nowISO(), rotationDue: '2025-10-01' },
  ],
};

// Seed runs
globalThis.__runs = globalThis.__runs || [];
for (let i = 0; i < 8; i++) {
  const ts = Date.now() - (8 - i) * 60_000;
  const id = `run_${ts}_${i}`;
  const rec = {
    id,
    pipeline: i % 2 ? 'Build IntelGraph' : 'Run Tests',
    status: ['Queued', 'Running', 'Succeeded', 'Failed'][i % 4],
    durationMs: rnd(400, 4200),
    cost: Number((Math.random() * 2).toFixed(2)),
    startedAt: new Date(ts).toISOString(),
    createdAt: ts,
    autonomyLevel: 3,
    canary: 0.1,
    budgetCap: 200,
    commitSha: 'abc1234',
    repo: 'org/repo',
    ghRunUrl: 'https://github.com/org/repo/actions/runs/123456',
  };
  db.runs.push(rec);
  globalThis.__runs.push(rec);
}

// Helper: find run by id
const findRun = (id) => db.runs.find((r) => r.id === id);

function errSigNormalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '{hex}')
    .replace(/\b\d{3,}\b/g, '{num}')
    .replace(/timeout after \d+ms/g, 'timeout after {num}ms')
    .replace(/at .+:\d+:\d+/g, 'at {file}:{num}:{num}')
    .slice(0, 200);
}

function previousRunId(currId) {
  const all = (globalThis.__runs || []).sort((a, b) => a.createdAt - b.createdAt);
  const idx = all.findIndex((r) => r.id === currId);
  return idx > 0 ? all[idx - 1].id : null;
}

function fakeGraphFor(_id) {
  // Simple variation for demo
  const baseNodes = [
    { id: 'source', label: 'source', status: 'succeeded', durationMs: rnd(120, 300) },
    { id: 'validate', label: 'validate', status: 'succeeded', durationMs: rnd(80, 200) },
    { id: 'enrich', label: 'enrich', status: 'running', durationMs: rnd(200, 500), retryCount: 1 },
    { id: 'plan', label: 'plan', status: 'queued', durationMs: rnd(50, 150) },
    { id: 'execute', label: 'execute', status: 'queued', durationMs: 0 },
    { id: 'report', label: 'report', status: 'queued', durationMs: 0 },
  ];
  const edges = [
    { source: 'source', target: 'validate' },
    { source: 'validate', target: 'enrich' },
    { source: 'enrich', target: 'plan' },
    { source: 'plan', target: 'execute' },
    { source: 'execute', target: 'report' },
  ];
  return { nodes: baseNodes, edges };
}

// GET /runs
app.get(`${API_BASE}/runs`, (req, res) => {
  res.json({ items: db.runs });
});

// GET /runs/:id
app.get(`${API_BASE}/runs/:id`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  res.json(run);
});

// GET /runs/:id/graph
app.get(`${API_BASE}/runs/:id/graph`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  const t0 = Date.now();
  const nodes = [
    { id: 'source', label: 'source', state: 'succeeded', retries: 0, startMs: 0 },
    { id: 'validate', label: 'validate', state: 'succeeded', retries: 0, startMs: 180 },
    { id: 'enrich', label: 'enrich', state: 'running', retries: 1, startMs: 420 },
    { id: 'plan', label: 'plan', state: 'queued', retries: 0, startMs: 920 },
    { id: 'execute', label: 'execute', state: 'queued', retries: 0, startMs: 0 },
    { id: 'report', label: 'report', state: 'queued', retries: 0, startMs: 0 },
    { id: 'fallback', label: 'fallback', state: 'queued', retries: 0, compensated: false, startMs: 300 },
  ];
  const edges = [
    { from: 'source', to: 'validate' },
    { from: 'validate', to: 'enrich' },
    { from: 'enrich', to: 'plan' },
    { from: 'plan', to: 'execute' },
    { from: 'execute', to: 'report' },
    { from: 'source', to: 'fallback' },
  ];
  res.json({ nodes, edges });
});

// Graph compare (current vs baseline)
app.get(`${API_BASE}/runs/:id/graph-compare`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  const baseId = req.query.baseline || previousRunId(run.id);
  const current = fakeGraphFor(run.id);
  const baseline = baseId ? fakeGraphFor(baseId) : { nodes: [], edges: [] };
  res.json({ runId: run.id, baselineRunId: baseId, current, baseline });
});

// SSE: GET /runs/:id/logs?stream=true
app.get(`${API_BASE}/runs/:id/logs`, (req, res) => {
  const { stream, nodeId } = req.query;
  if (!stream) return res.json({ lines: [] });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  let count = 0;
  const nodeIds = ['source','validate','enrich','plan','execute','report','fallback'];
  const timer = setInterval(() => {
    const n = nodeId || nodeIds[count % nodeIds.length];
    const line = { ts: nowISO(), nodeId: String(n), text: `[${n}] log line ${++count} for run ${req.params.id}` };
    res.write(`data: ${JSON.stringify(line)}\n\n`);
    if (count > 1000) { clearInterval(timer); res.end(); }
  }, 400);
  req.on('close', () => clearInterval(timer));
});

// Node-level metrics
app.get(`${API_BASE}/runs/:id/nodes/:nodeId/metrics`, (req, res) => {
  res.json({
    cpuPct: Number((Math.random() * 70).toFixed(1)),
    memMB: rnd(150, 500),
    tokens: rnd(1000, 20000),
    cost: Number((Math.random() * 0.05).toFixed(4)),
    durationMs: rnd(120, 2400),
    retries: rnd(0, 2),
  });
});

// Node-level evidence
app.get(`${API_BASE}/runs/:id/nodes/:nodeId/evidence`, (req, res) => {
  res.json({
    artifacts: [
      { name: `${req.params.nodeId}-output.json`, digest: 'sha256:deadbeef', size: '12KB' },
    ],
    traceId: 'trace-123-abc',
    provenance: { sbom: 'present', cosign: 'verified', slsa: 'attested' },
  });
});

// Run-level evidence summary
app.get(`${API_BASE}/runs/:id/evidence`, (req, res) => {
  const id = req.params.id;
  res.json({
    runId: id,
    sbom: { present: true, href: `https://example.com/artifacts/${id}/sbom.spdx.json` },
    cosign: { signed: true, verifyCmd: `cosign verify --key cosign.pub ghcr.io/intelgraph/app@sha256:deadbeef` },
    slsa: { present: true, href: `https://example.com/artifacts/${id}/slsa.attestation` },
    attestations: [
      { type: 'provenance', issuer: 'cosign', ref: 'ghcr.io/intelgraph/builder', ts: Date.now() - 120000 },
      { type: 'policy', issuer: 'opa', ref: 'build.safety', ts: Date.now() - 60000 }
    ],
  });
});

// ===== Evidence integrity check per node ====================================
app.get(`${API_BASE}/runs/:id/evidence/check`, (req, res) => {
  const id = req.params.id;
  const nodes = ['fetch_sources','build_container','scan_sbom','sign_image'].map(n => {
    const sbom = Math.random() > 0.1, cosign = Math.random() > 0.15, slsa = Math.random() > 0.2;
    return {
      nodeId: n,
      sbom: { present: sbom, url: sbom ? `https://example.com/${id}/${n}/sbom.json` : null },
      cosign: { present: cosign, verified: cosign && Math.random() > 0.05, url: cosign ? `https://example.com/${id}/${n}/cosign.sig` : null },
      slsa: { present: slsa, level: slsa ? 'L2' : null, url: slsa ? `https://example.com/${id}/${n}/slsa.intoto` : null },
    };
  });
  const summary = {
    nodes: nodes.length,
    sbom: nodes.filter(x => x.sbom.present).length,
    cosign: nodes.filter(x => x.cosign.present && x.cosign.verified).length,
    slsa: nodes.filter(x => x.slsa.present).length,
    pass: nodes.every(x => x.sbom.present && x.cosign.present && x.cosign.verified && x.slsa.present),
  };
  res.json({ runId: id, summary, nodes });
});

// POST /runs/:id/replay
app.post(`${API_BASE}/runs/:id/replay`, (req, res) => {
  // accept { nodeId, reason }
  res.json({ ok: true, replayRunId: `run_${Date.now()}_replay` });
});

// PATCH /autonomy
app.patch(`${API_BASE}/autonomy`, (req, res) => {
  const { level } = req.body || {};
  const gates = level >= 3 ? ['dualApproval'] : [];
  res.json({ decision: { allowed: true, gates, reasons: [] }, preview: { riskBands: { low: 60, med: 30, high: 10 } } });
});

// Budgets
app.get(`${API_BASE}/budgets`, (req, res) => {
  res.json(db.budgets);
});
app.put(`${API_BASE}/budgets`, (req, res) => {
  const { cap } = req.body || {};
  if (typeof cap === 'number') db.budgets.cap = cap;
  res.json(db.budgets);
});

// Tickets
app.post(`${API_BASE}/tickets`, (req, res) => {
  res.json({ id: `gh_${rnd(1000, 9999)}`, url: 'https://github.com/org/repo/issues/1234' });
});

// Policy explain
app.post(`${API_BASE}/policies/explain`, (req, res) => {
  const input = req.body?.input || {};
  const deny = input?.env === 'prod' && input?.riskScore >= 8;
  res.json({
    allowed: !deny,
    rulePath: deny ? 'policy.freeze.prod_risk_high' : 'policy.default.allow',
    reasons: deny ? ['Risk score >= 8 in prod'] : [],
    inputs: input,
    trace: [
      'eval policy.freeze',
      `input.env = ${input.env || 'unknown'}`,
      `input.riskScore = ${input.riskScore || 'n/a'}`,
      deny ? 'deny due to high risk' : 'allow by default',
    ],
    whatIf: {
      withLowerRisk: { allowed: true, reasons: [] },
      withNonProd: { allowed: true, reasons: [] },
    },
  });
});

// Routing preview
app.post(`${API_BASE}/routing/preview`, (req, res) => {
  const task = req.body?.task || 'unknown';
  res.json({
    decision: { model: 'gpt-4o-mini', confidence: 0.72, reason: `chosen for task: ${task.slice(0,30)}` },
    candidates: [
      { model: 'gpt-4o-mini', score: 0.72 },
      { model: 'gpt-4o', score: 0.65 },
      { model: 'ollama/llama3.1:8b', score: 0.52 },
    ],
  });
});

// Routing pins (per route)
globalThis.__routingPins = globalThis.__routingPins || {};
app.get(`${API_BASE}/routing/pins`, (_req, res) => {
  res.json(globalThis.__routingPins);
});
app.put(`${API_BASE}/routing/pin`, (req, res) => {
  const { route, model } = req.body || {};
  if (!route || !model) return res.status(400).json({ error: 'route & model required' });
  globalThis.__routingPins[route] = model;
  res.json({ ok: true });
});
// Unpin route
app.delete(`${API_BASE}/routing/pin`, (req, res) => {
  const route = req.query.route;
  if (!route) return res.status(400).json({ error: 'route required' });
  delete globalThis.__routingPins[route];
  res.json({ ok: true });
});

// CI Annotations (per run)
globalThis.__ci = globalThis.__ci || [];
app.get(`${API_BASE}/runs/:id/ci/annotations`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  // Generate sample annotations with repo/sha
  const anns = [
    { id: `a_${Date.now()}_1`, runId: run.id, level: 'failure', ts: Date.now(), repo: run.repo, sha: run.commitSha, path: 'src/lib/util.ts', startLine: 42, message: 'Unit test failed', url: `${run.ghRunUrl}` },
    { id: `a_${Date.now()}_2`, runId: run.id, level: 'warning', ts: Date.now(), repo: run.repo, sha: run.commitSha, path: 'client/index.html', startLine: 1, message: 'Lighthouse perf drop', url: `${run.ghRunUrl}` },
  ];
  res.json({ items: anns });
});

// CI Annotations (global filtered)
app.get(`${API_BASE}/ci/annotations`, (req, res) => {
  const level = req.query.level; // 'failure'|'warning'|'notice'
  const repo = req.query.repo;
  const sinceMs = parseInt(req.query.sinceMs || (24*3600*1000), 10);
  const now = Date.now();
  const allRuns = (globalThis.__runs || []).slice(-10);
  const anns = [];
  for (const r of allRuns) {
    anns.push({ id: `g_${r.id}_1`, runId: r.id, level: 'failure', ts: r.createdAt, repo: r.repo, sha: r.commitSha, path: 'src/lib/util.ts', startLine: 42, message: 'Unit test failed', url: r.ghRunUrl });
    anns.push({ id: `g_${r.id}_2`, runId: r.id, level: 'warning', ts: r.createdAt, repo: r.repo, sha: r.commitSha, path: 'client/index.html', startLine: 1, message: 'Lighthouse perf drop', url: r.ghRunUrl });
  }
  const filtered = anns.filter(a => (now - a.ts) <= sinceMs && (!level || a.level === level) && (!repo || a.repo === repo));
  res.json({ annotations: filtered });
});

// ---- Per-tenant SLO summaries & time series -------------------------------
app.get(`${API_BASE}/metrics/slo`, (req, res) => {
  const tenant = req.query.tenant || null;
  const slo = 0.995;
  const fastBurn = Math.max(0, 0.8 + Math.random() * 0.8);
  const slowBurn = Math.max(0, 0.6 + Math.random() * 0.7);
  res.json({
    tenant,
    slo,
    windowFast: '1h',
    windowSlow: '6h',
    fastBurn,
    slowBurn,
    errorRate: { fast: (1 - slo) * fastBurn, slow: (1 - slo) * slowBurn },
    updatedAt: Date.now(),
  });
});

app.get(`${API_BASE}/metrics/slo/timeseries`, (req, res) => {
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const stepMs = parseInt(req.query.stepMs || 10 * 60 * 1000, 10);
  const tenant = req.query.tenant || null;
  const pts = [];
  let t = Date.now() - windowMs;
  while (t <= Date.now()) {
    const baseline = Math.sin(t / 3.6e6) * 0.3 + 1.0; // 0.7..1.3
    pts.push({
      ts: t,
      fastBurn: Math.max(0, baseline + (Math.random() - 0.5) * 0.3),
      slowBurn: Math.max(0, baseline * 0.8 + (Math.random() - 0.5) * 0.2),
    });
    t += stepMs;
  }
  res.json({ tenant, points: pts });
});

// ---- DLQ signature persistence & trend lines ------------------------------
globalThis.__dlq = globalThis.__dlq || [];
globalThis.__dlqSig = globalThis.__dlqSig || {};

function canonSig(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '{hex}')
    .replace(/\b\d{3,}\b/g, '{num}')
    .replace(/timeout after \d+ms/g, 'timeout after {num}ms')
    .replace(/at .+:\d+:\d+/g, 'at {file}:{num}:{num}')
    .slice(0, 200);
}

function recordDlq(item) {
  globalThis.__dlq.push(item);
  const sig = canonSig(item.error);
  const now = Date.now();
  const rec = globalThis.__dlqSig[sig] || { count: 0, lastTs: 0, timeseries: [] };
  rec.count += 1;
  rec.lastTs = now;
  const bucket = Math.floor(now / (10 * 60 * 1000)) * (10 * 60 * 1000);
  const last = rec.timeseries[rec.timeseries.length - 1];
  if (!last || last.ts !== bucket) rec.timeseries.push({ ts: bucket, count: 1 });
  else last.count += 1;
  globalThis.__dlqSig[sig] = rec;
}

// list persisted signatures, trend direction by last two buckets
app.get(`${API_BASE}/ops/dlq/signatures`, (_req, res) => {
  const out = Object.entries(globalThis.__dlqSig).map(([sig, rec]) => {
    const series = rec.timeseries || [];
    const n = series.length;
    const trend = n >= 2 ? Math.sign(series[n - 1].count - series[n - 2].count) : 0;
    return { sig, count: rec.count, lastTs: rec.lastTs, trend, sample: series[n - 1] || null };
  }).sort((a, b) => b.count - a.count);
  res.json({ signatures: out });
});

// time series for a signature
app.get(`${API_BASE}/ops/dlq/signatures/timeseries`, (req, res) => {
  const sig = req.query.sig;
  const rec = globalThis.__dlqSig[sig] || { timeseries: [] };
  res.json({ sig, points: rec.timeseries });
});

// ---- DLQ auto-replay policy ----------------------------------------------
globalThis.__dlqPolicy = globalThis.__dlqPolicy || {
  enabled: false,
  dryRun: true,
  allowKinds: ['BUILD_IMAGE', 'LITELLM_CHAT'],
  allowSignatures: [],
  maxReplaysPerMinute: 20,
};
globalThis.__dlqAudit = globalThis.__dlqAudit || [];

app.get(`${API_BASE}/ops/dlq/policy`, (_req, res) => res.json(globalThis.__dlqPolicy));
app.put(`${API_BASE}/ops/dlq/policy`, (req, res) => {
  const p = req.body || {};
  globalThis.__dlqPolicy = { ...globalThis.__dlqPolicy, ...p };
  globalThis.__dlqAudit.push({ ts: Date.now(), action: 'policy.update', details: p });
  res.json({ ok: true, policy: globalThis.__dlqPolicy });
});
app.get(`${API_BASE}/ops/dlq/audit`, (_req, res) => res.json({ items: globalThis.__dlqAudit.slice(-50).reverse() }));

let tokens = globalThis.__dlqPolicy.maxReplaysPerMinute;
setInterval(() => {
  tokens = globalThis.__dlqPolicy.maxReplaysPerMinute;
}, 60 * 1000);

setInterval(() => {
  const pol = globalThis.__dlqPolicy;
  if (!pol.enabled) return;
  const allowSig = pol.allowSignatures || [];
  const allowKinds = new Set(pol.allowKinds || []);
  const keep = [];
  for (const item of globalThis.__dlq) {
    const sig = canonSig(item.error);
    const passKind = allowKinds.has(item.kind);
    const passSig = allowSig.length === 0 || allowSig.some(s => sig.includes(s));
    if (passKind && passSig && tokens > 0) {
      tokens--;
      globalThis.__dlqAudit.push({ ts: Date.now(), action: pol.dryRun ? 'autoreplay.dryrun' : 'autoreplay.replay', details: { id: item.id, runId: item.runId, stepId: item.stepId, kind: item.kind, sig } });
      if (!pol.dryRun) {
        continue;
      }
    }
    keep.push(item);
  }
  globalThis.__dlq = keep;
}, 5000);

// Compare previous run
app.get(`${API_BASE}/runs/:id/compare/previous`, (req, res) => {
  res.json({ durationDeltaMs: -320, costDelta: -0.05, changedNodes: [ { id: 'enrich', durationDeltaMs: -120 }, { id: 'plan', durationDeltaMs: 80 } ] });
});

// Pipelines validation
app.post(`${API_BASE}/pipelines/:id/validate`, (req, res) => {
  const valid = true;
  res.json({ valid, errors: [] });
});

// Providers status + test connection
let providers = [
  { id: 'litellm', name: 'LiteLLM Router', status: 'UP', latencyMs: 120 },
  { id: 'ollama', name: 'Ollama Node', status: 'UP', latencyMs: 30 },
];
app.get(`${API_BASE}/providers`, (req, res) => {
  res.json({ items: providers });
});
app.post(`${API_BASE}/providers/:id/test`, (req, res) => {
  const p = providers.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  p.status = 'UP'; p.latencyMs = rnd(20, 180);
  res.json({ ok: true, item: p });
});

// Node routing decision/candidates
app.get(`${API_BASE}/runs/:id/nodes/:nodeId/routing`, (req, res) => {
  const nodeId = req.params.nodeId;
  const candidates = [
    { model: 'gpt-4o-mini', score: 0.72, cost: 0.002, p95ms: 180 },
    { model: 'gpt-4o', score: 0.65, cost: 0.004, p95ms: 220 },
    { model: 'ollama/llama3.1:8b', score: 0.52, cost: 0, p95ms: 90 },
  ];
  const decision = candidates[0];
  const policy = { allow: true, rulePath: 'policy.default.allow', reasons: [] };
  res.json({ nodeId, decision, candidates, policy });
});

// Serving lane metrics (toy)
app.get(`${API_BASE}/serving/metrics`, (_req, res) => {
  const now = Date.now();
  const recent = Array.from({ length: 24 }).map((_, i) => ({
    ts: now - (24 - i) * 60 * 1000,
    qDepth: Math.floor(Math.random() * 20),
    batch: Math.floor(1 + Math.random() * 8),
    kvHit: +(0.5 + Math.random() * 0.5).toFixed(2),
  }));
  res.json({
    summary: { qDepth: recent[recent.length - 1].qDepth, batch: recent[recent.length - 1].batch, kvHit: recent[recent.length - 1].kvHit },
    series: recent,
  });
});

// CI trends (counts by level per bucket)
app.get(`${API_BASE}/ci/annotations/trends`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || (24 * 3600 * 1000), 10);
  const stepMs = parseInt(req.query.stepMs || (60 * 60 * 1000), 10);
  const now = Date.now();
  const out = [];
  for (let t = now - sinceMs; t <= now; t += stepMs) {
    out.push({ ts: t, failure: Math.floor(Math.random() * 4), warning: Math.floor(Math.random() * 6), notice: Math.floor(Math.random() * 3) });
  }
  res.json({ buckets: out });
});

// Pipelines
app.get(`${API_BASE}/pipelines`, (req, res) => {
  res.json({ items: db.pipelines.map(p => ({ id: p.id, name: p.name, version: p.version, owner: p.owner })) });
});
app.get(`${API_BASE}/pipelines/:id`, (req, res) => {
  const p = db.pipelines.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'pipeline not found' });
  res.json(p);
});
app.post(`${API_BASE}/pipelines/:id/plan`, (req, res) => {
  // naive diff preview: always return a fake change set
  res.json({ changes: [ { type: 'modify', path: 'steps[1]', before: 'test', after: 'test:ci' } ], costEstimate: { delta: 0.02 } });
});

// Secrets
app.get(`${API_BASE}/secrets`, (req, res) => {
  res.json({ items: db.secrets });
});
app.post(`${API_BASE}/secrets/:id/rotate`, (req, res) => {
  const s = db.secrets.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  s.rotationDue = '2026-01-01';
  res.json({ ok: true, item: s });
});

// ===== EvalOps: scorecards & gates ==========================================
globalThis.__evalBaselines = globalThis.__evalBaselines || {
  intelgraph_pr_build: { latencyMs: 600000, failPct: 0.02, costUsd: 2.5, policy: 0 },
};

function evalRun(runId) {
  const latency = Math.floor(3 * 60e3 + Math.random() * 10 * 60e3); // 3–13m
  const fail = Math.random() < 0.1 ? 1 : 0;
  const cost = +(0.5 + Math.random() * 4).toFixed(2);
  const policy = Math.random() < 0.1 ? 1 : 0;
  return { runId, latencyMs: latency, fail, costUsd: cost, policyViolations: policy };
}

app.get(`${API_BASE}/eval/scorecards/run/:id`, (req, res) => {
  const measures = evalRun(req.params.id);
  const pipeline = 'intelgraph_pr_build';
  const base = globalThis.__evalBaselines[pipeline];
  const rows = [
    { metric: 'latencyMs', value: measures.latencyMs, target: base.latencyMs, pass: measures.latencyMs <= base.latencyMs },
    { metric: 'fail', value: measures.fail, target: 0, pass: measures.fail === 0 },
    { metric: 'costUsd', value: measures.costUsd, target: base.costUsd, pass: measures.costUsd <= base.costUsd },
    { metric: 'policyViolations', value: measures.policyViolations, target: 0, pass: measures.policyViolations === 0 },
  ];
  const pass = rows.every(r => r.pass);
  res.json({ runId: measures.runId, pipeline, rows, overall: pass ? 'PASS' : 'FAIL' });
});

app.get(`${API_BASE}/eval/scorecards/pipeline/:id/baseline`, (req, res) => {
  const id = req.params.id;
  res.json({ pipeline: id, baseline: globalThis.__evalBaselines[id] || null });
});

app.put(`${API_BASE}/eval/scorecards/pipeline/:id/baseline`, (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  globalThis.__evalBaselines[id] = { latencyMs: b.latencyMs || 600000, failPct: b.failPct || 0.02, costUsd: b.costUsd || 2.5, policy: b.policy || 0 };
  res.json({ ok: true, pipeline: id, baseline: globalThis.__evalBaselines[id] });
});

globalThis.__evalGates = globalThis.__evalGates || { intelgraph_pr_build: { blockOn: ['latencyMs', 'fail', 'policyViolations'] } };

app.get(`${API_BASE}/eval/gates/pipeline/:id`, (req, res) => {
  const id = req.params.id;
  res.json({ pipeline: id, gate: globalThis.__evalGates[id] || { blockOn: [] } });
});

app.post(`${API_BASE}/eval/gates/check`, (req, res) => {
  const { runId, pipeline } = req.body || {};
  const sc = evalRun(runId);
  const base = globalThis.__evalBaselines[pipeline] || { latencyMs: 600000, costUsd: 2.5 };
  const rows = [
    { metric: 'latencyMs', pass: sc.latencyMs <= base.latencyMs, value: sc.latencyMs, target: base.latencyMs },
    { metric: 'fail', pass: sc.fail === 0, value: sc.fail, target: 0 },
    { metric: 'costUsd', pass: sc.costUsd <= base.costUsd, value: sc.costUsd, target: base.costUsd },
    { metric: 'policyViolations', pass: sc.policyViolations === 0, value: sc.policyViolations, target: 0 },
  ];
  const gate = globalThis.__evalGates[pipeline] || { blockOn: [] };
  const failing = rows.filter(r => gate.blockOn.includes(r.metric) && !r.pass).map(r => r.metric);
  res.json({ runId, pipeline, rows, gate, status: failing.length ? 'BLOCK' : 'ALLOW', failing });
});

// ===== Agent/HITL ============================================================
globalThis.__agentSteps = globalThis.__agentSteps || {};
function makeStep(id, role, text) { return { id, role, text, ts: Date.now(), state: 'pending' }; }

app.get(`${API_BASE}/runs/:id/agent/steps`, (req, res) => {
  const id = req.params.id;
  if (!globalThis.__agentSteps[id]) {
    globalThis.__agentSteps[id] = [
      makeStep('s1', 'planner', 'Plan build tasks'),
      makeStep('s2', 'critic', 'Check for risky steps'),
      makeStep('s3', 'executor', 'Run container build'),
    ];
  }
  res.json({ runId: id, steps: globalThis.__agentSteps[id] });
});

app.get(`${API_BASE}/runs/:id/agent/stream`, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const id = req.params.id;
  let i = 0;
  const timer = setInterval(() => {
    const st = (globalThis.__agentSteps[id] ||= []);
    if (i < st.length) {
      st[i].state = 'need_approval';
      res.write(`event: step\n`);
      res.write(`data: ${JSON.stringify(st[i])}\n\n`);
      i++;
    } else {
      clearInterval(timer);
      res.end();
    }
  }, 2000);
  req.on('close', () => clearInterval(timer));
});

app.post(`${API_BASE}/runs/:id/agent/actions`, (req, res) => {
  const id = req.params.id;
  const { stepId, action, patch } = req.body || {};
  const steps = globalThis.__agentSteps[id] || [];
  const s = steps.find(x => x.id === stepId);
  if (!s) return res.status(404).json({ error: 'step not found' });
  if (action === 'approve') s.state = 'approved';
  if (action === 'block') s.state = 'blocked';
  if (action === 'edit') { s.text = patch || s.text; s.state = 'approved'; }
  res.json({ ok: true, step: s });
});

// ===== AlertCenter correlation ==============================================
app.get(`${API_BASE}/alertcenter/incidents`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 6 * 60 * 60 * 1000, 10);
  const windowMs = parseInt(req.query.windowMs || 15 * 60 * 1000, 10);
  const now = Date.now();
  const feed = (globalThis.__alertEvents || []).map(e => ({ ...e, type: e.kind==='serving'?'serving':'forecast', severity: e.severity || 'page', title: e.title }))
    .concat(((globalThis.__ci || []).filter(a => (now - a.ts) <= sinceMs).map(a => ({ id: `ci:${a.id}`, ts: a.ts, type: 'ci', severity: a.level === 'failure' ? 'page' : 'warn', title: a.message, link: a.url || null, meta: { runId: a.runId, repo: a.repo } }))))
    .concat(['acme', 'globex'].map(t => ({ id: `slo:${t}:${now}`, ts: now - Math.floor(Math.random() * windowMs), type: 'slo', severity: 'warn', title: `SLO burn ${t}`, link: null, meta: { tenant: t } })));
  const bucket = (ts) => Math.floor(ts / windowMs);
  const groups = new Map();
  for (const e of feed) {
    const tenant = e.meta?.tenant || 'acme';
    const key = `${tenant}|${bucket(e.ts)}`;
    const g = groups.get(key) || { id: key, tenant, startTs: e.ts, endTs: e.ts, events: [] };
    g.startTs = Math.min(g.startTs, e.ts); g.endTs = Math.max(g.endTs, e.ts); g.events.push(e);
    groups.set(key, g);
  }
  const incidents = [...groups.values()].map(g => {
    const sev = g.events.some(x => x.severity === 'page') ? 'page' : g.events.some(x => x.severity === 'warn') ? 'warn' : 'info';
    return { ...g, severity: sev, count: g.events.length };
  }).sort((a, b) => b.endTs - a.endTs);
  res.json({ incidents });
});
// ---------- Tenant Cost Drill-down (stub data) ------------------------------
app.get(`${API_BASE}/metrics/cost/tenant`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const totalUsd = +(Math.random() * 12 + 3).toFixed(2);
  const byPipeline = [
    { pipeline: 'intelgraph_pr_build', usd: +(totalUsd * 0.52).toFixed(2) },
    { pipeline: 'intelgraph_release', usd: +(totalUsd * 0.33).toFixed(2) },
    { pipeline: 'security_scan', usd: +(totalUsd * 0.15).toFixed(2) },
  ];
  const byModelProvider = [
    { provider: 'openai', model: 'gpt-4o-mini', usd: +(totalUsd * 0.28).toFixed(2) },
    { provider: 'bedrock', model: 'anthropic.claude-3-haiku', usd: +(totalUsd * 0.22).toFixed(2) },
    { provider: 'ollama', model: 'qwen2.5-coder:14b', usd: +(totalUsd * 0.18).toFixed(2) },
    { provider: 'openai', model: 'text-embedding-3-small', usd: +(totalUsd * 0.07).toFixed(2) },
    { provider: 'other', model: 'misc', usd: +(totalUsd * 0.25).toFixed(2) },
  ];
  const recentRuns = Array.from({ length: 8 }).map((_, i) => ({
    runId: `r${Math.random().toString(16).slice(2, 10)}`,
    pipeline: byPipeline[i % byPipeline.length].pipeline,
    startedAt: Date.now() - i * 3600 * 1000,
    durationMs: Math.floor(Math.random() * 8 + 3) * 60 * 1000,
    usd: +(Math.random() * 2).toFixed(2),
    tokens: Math.floor(Math.random() * 50000),
  }));
  res.json({ tenant, windowMs, totalUsd, byPipeline, byModelProvider, recentRuns });
});

app.get(`${API_BASE}/metrics/cost/tenant/timeseries`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const stepMs = parseInt(req.query.stepMs || 10 * 60 * 1000, 10);
  const now = Date.now();
  const points = [];
  for (let t = now - windowMs; t <= now; t += stepMs) {
    points.push({ ts: t, usd: +(Math.max(0, Math.sin(t / 2e6) + 1) * 0.5 + Math.random() * 0.15).toFixed(3) });
  }
  res.json({ tenant, points });
});

// ---------- DLQ list + root causes + simulator ------------------------------
// list DLQ items (toy)
app.get(`${API_BASE}/ops/dlq`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 7 * 24 * 3600 * 1000, 10);
  const now = Date.now();
  const items = (globalThis.__dlq || []).filter(x => now - x.ts <= sinceMs);
  res.json({ items });
});

// root-cause groups by step+kind+provider
app.get(`${API_BASE}/ops/dlq/rootcauses`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 7 * 24 * 3600 * 1000, 10);
  const now = Date.now();
  const rows = (globalThis.__dlq || []).filter(x => now - x.ts <= sinceMs);
  const map = new Map();
  for (const x of rows) {
    const provider = /openai|gpt|claude|anthropic|mistral|ollama/i.test(x.error)
      ? 'llm'
      : x.kind?.includes('BUILD')
      ? 'ci'
      : 'other';
    const key = `${x.stepId}|${x.kind}|${provider}`;
    const g = map.get(key) || {
      stepId: x.stepId,
      kind: x.kind,
      provider,
      count: 0,
      lastTs: 0,
      itemIds: [],
      signature: canonSig(x.error),
      sampleError: x.error,
    };
    g.count++;
    g.lastTs = Math.max(g.lastTs, x.ts || Date.now());
    g.itemIds.push(x.id);
    map.set(key, g);
  }
  res.json({ groups: [...map.values()].sort((a, b) => b.count - a.count) });
});

// policy simulate for DLQ item
app.post(`${API_BASE}/ops/dlq/policy/simulate`, (req, res) => {
  const item = req.body?.item || {};
  const pol = globalThis.__dlqPolicy || {};
  const sig = canonSig(item.error || '');
  const passKind = (pol.allowKinds || []).includes(item.kind);
  const passSig = (pol.allowSignatures || []).length === 0 || (pol.allowSignatures || []).some(s => sig.includes(s));
  const enabled = !!pol.enabled;
  const limited = (pol.maxReplaysPerMinute || 0) <= 0;
  const allow = enabled && passKind && passSig && !limited;
  res.json({
    enabled,
    dryRun: !!pol.dryRun,
    passKind,
    passSig,
    rateLimited: limited,
    decision: allow ? (pol.dryRun ? 'DRY_RUN' : 'ALLOW') : 'DENY',
    reasons: [
      enabled ? null : 'policy disabled',
      passKind ? null : `kind ${item.kind} not in allowKinds`,
      passSig ? null : `signature not allowed`,
      limited ? 'rate limit exhausted' : null,
    ].filter(Boolean),
    normalizedSignature: sig,
  });
});

// ---------- Budgets + Forecast + Anomalies ---------------------------------
globalThis.__budgets = globalThis.__budgets || { acme: { monthlyUsd: 100 } };

app.get(`${API_BASE}/budgets/tenant`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const b = globalThis.__budgets[tenant] || { monthlyUsd: 100 };
  res.json({ tenant, monthlyUsd: b.monthlyUsd });
});
app.put(`${API_BASE}/budgets/tenant`, (req, res) => {
  const { tenant, monthlyUsd } = req.body || {};
  if (!tenant || typeof monthlyUsd !== 'number') return res.status(400).json({ error: 'tenant & monthlyUsd required' });
  globalThis.__budgets[tenant] = { monthlyUsd };
  res.json({ ok: true, tenant, monthlyUsd });
});

function synthCostSeries(windowMs = 24 * 3600 * 1000, stepMs = 60 * 60 * 1000) {
  const now = Date.now();
  const pts = [];
  for (let t = now - windowMs; t <= now; t += stepMs) {
    const base = Math.max(0, Math.sin(t / 2e6) + 1) * 0.4 + 0.05;
    pts.push({ ts: t, usd: +(base + (Math.random() - 0.5) * 0.1).toFixed(3) });
  }
  return pts;
}
function ema(series, alpha = 0.5) {
  if (!series.length) return [];
  let s = series[0].usd;
  const out = [{ ts: series[0].ts, ema: s }];
  for (let i = 1; i < series.length; i++) {
    s = alpha * series[i].usd + (1 - alpha) * s;
    out.push({ ts: series[i].ts, ema: s });
  }
  return out;
}

app.get(`${API_BASE}/metrics/cost/tenant/forecast`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const hours = parseInt(req.query.hours || 48, 10);
  const alpha = parseFloat(req.query.alpha || 0.5);
  const budgetUsd = req.query.budgetUsd ? parseFloat(req.query.budgetUsd) : (globalThis.__budgets[tenant]?.monthlyUsd || 100);
  const stepMs = 60 * 60 * 1000;
  const hist = synthCostSeries(48 * stepMs, stepMs);
  const smooth = ema(hist, alpha);
  const mean = hist.reduce((a, b) => a + b.usd, 0) / (hist.length || 1);
  const std = Math.sqrt(hist.reduce((a, b) => a + Math.pow(b.usd - mean, 2), 0) / (hist.length || 1)) || 0.1;
  const last = smooth[smooth.length - 1]?.ema || mean;
  const startTs = hist[hist.length - 1]?.ts || Date.now();
  const forecast = Array.from({ length: hours }).map((_, i) => ({ ts: startTs + (i + 1) * stepMs, usd: +last.toFixed(3), lo: +(last - std).toFixed(3), hi: +(last + std).toFixed(3) }));
  const hourlyAvg = mean;
  const projectedMonthUsd = +(hourlyAvg * 24 * 30).toFixed(2);
  const risk = projectedMonthUsd >= budgetUsd * 1.05 ? 'BREACH' : projectedMonthUsd >= budgetUsd * 0.8 ? 'WARN' : 'HEALTHY';

  // Emit forecast event if route exists
  const route = (globalThis.__alertRoutes || []).find(r => r.tenant === tenant && r.type === 'forecast');
  if (route && risk === 'BREACH') {
    globalThis.__alertEvents = globalThis.__alertEvents || [];
    globalThis.__alertEvents.push({ id: Math.random().toString(16).slice(2, 10), routeId: route.id, ts: Date.now(), tenant, severity: route.severity || 'page', title: `Budget forecast breach for ${tenant}`, body: `Projected ${projectedMonthUsd} >= budget ${budgetUsd}` });
  }

  res.json({ tenant, budgetUsd, hourlyAvg: +hourlyAvg.toFixed(3), projectedMonthUsd, hist, smooth, forecast, risk });
});

app.get(`${API_BASE}/metrics/cost/tenant/anomalies`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const stepMs = parseInt(req.query.stepMs || 60 * 60 * 1000, 10);
  const thr = parseFloat(req.query.z || 3.0);
  const series = synthCostSeries(windowMs, stepMs);
  const mean = series.reduce((a, b) => a + b.usd, 0) / (series.length || 1);
  const std = Math.sqrt(series.reduce((a, b) => a + Math.pow(b.usd - mean, 2), 0) / (series.length || 1)) || 1;
  const anomalies = series.map(p => ({ ...p, z: +(Math.abs((p.usd - mean) / std)).toFixed(2) })).filter(p => p.z >= thr);
  res.json({ tenant, mean: +mean.toFixed(3), std: +std.toFixed(3), threshold: thr, series, anomalies });
});

// ---------- Alert routes & events ------------------------------------------
globalThis.__alertRoutes = globalThis.__alertRoutes || [];
globalThis.__alertEvents = globalThis.__alertEvents || [];
function uid() { return Math.random().toString(16).slice(2, 10); }

app.get(`${API_BASE}/alerts/routes`, (_req, res) => {
  res.json({ routes: globalThis.__alertRoutes });
});
app.post(`${API_BASE}/alerts/routes`, (req, res) => {
  const { type, tenant, severity = 'page', receiver = 'email', meta = {} } = req.body || {};
  if (type !== 'forecast' || !tenant) return res.status(400).json({ error: 'type=forecast and tenant required' });
  const r = { id: uid(), type, tenant, severity, receiver, meta, createdAt: Date.now() };
  globalThis.__alertRoutes.push(r);
  res.json({ ok: true, route: r });
});
app.delete(`${API_BASE}/alerts/routes/:id`, (req, res) => {
  const id = req.params.id;
  globalThis.__alertRoutes = (globalThis.__alertRoutes || []).filter(r => r.id !== id);
  res.json({ ok: true });
});
app.get(`${API_BASE}/alerts/events`, (_req, res) => {
  res.json({ events: (globalThis.__alertEvents || []).slice(-200).reverse() });
});
app.post(`${API_BASE}/alerts/events/test`, (req, res) => {
  const { tenant, title = 'Budget breach (TEST)', severity = 'page', body = '' } = req.body || {};
  const route = (globalThis.__alertRoutes || []).find(r => r.tenant === tenant && r.type === 'forecast');
  if (!route) return res.status(404).json({ error: 'no route for tenant' });
  const ev = { id: uid(), routeId: route.id, ts: Date.now(), tenant, severity, title, body };
  globalThis.__alertEvents.push(ev);
  res.json({ ok: true, event: ev });
});

// AlertCenter aggregator
app.get(`${API_BASE}/alertcenter/events`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 6 * 60 * 60 * 1000, 10);
  const now = Date.now();
  const ci = (globalThis.__ci || []).filter(a => now - a.ts <= sinceMs).map(a => ({ id: `ci:${a.id}`, ts: a.ts, type: 'ci', severity: a.level === 'failure' ? 'page' : 'warn', title: `CI ${a.level.toUpperCase()}: ${a.message}`, link: a.url || (a.repo && a.sha ? `https://github.com/${a.repo}/commit/${a.sha}` : null), meta: { runId: a.runId, repo: a.repo } }));
  const tenants = ['acme', 'globex'];
  const slo = tenants.map(t => {
    const slo = 0.995; const fastBurn = Math.max(0, 0.7 + Math.random() * 1.2); const slowBurn = Math.max(0, 0.6 + Math.random() * 1.0);
    const sev = fastBurn >= 2 || slowBurn >= 2 ? 'page' : fastBurn >= 1 || slowBurn >= 1 ? 'warn' : 'info';
    return { id: `slo:${t}:${now}`, ts: now - Math.floor(Math.random() * sinceMs / 2), type: 'slo', severity: sev, title: `SLO burn (${t}): fast=${fastBurn.toFixed(2)}x slow=${slowBurn.toFixed(2)}x`, link: null, meta: { tenant: t, slo, fastBurn, slowBurn } };
  });
  const forecast = (globalThis.__alertEvents || []).filter(e => now - e.ts <= sinceMs && !e.kind).map(e => ({ id: `fc:${e.id}`, ts: e.ts, type: 'forecast', severity: e.severity || 'page', title: e.title, link: null, meta: { tenant: e.tenant, body: e.body, routeId: e.routeId } }));
  const serving = (globalThis.__alertEvents || []).filter(e => now - e.ts <= sinceMs && e.kind === 'serving').map(e => ({ id: `serv:${e.id}`, ts: e.ts, type: 'serving', severity: e.severity || 'warn', title: e.title, link: null, meta: { body: e.body } }));
  const events = [...ci, ...slo, ...forecast, ...serving].sort((a, b) => b.ts - a.ts).slice(0, 200);
  res.json({ events });
});

// ---------- Provider limits and usage --------------------------------------
globalThis.__providerLimits = globalThis.__providerLimits || {};
app.put(`${API_BASE}/providers/:id/limits`, (req, res) => {
  const id = req.params.id; const rpm = Number(req.body?.rpm || 0);
  if (!id || isNaN(rpm) || rpm <= 0) return res.status(400).json({ error: 'rpm>0 required' });
  globalThis.__providerLimits[id] = { rpm, updatedAt: Date.now() };
  res.json({ ok: true, provider: id, rpm });
});
app.get(`${API_BASE}/providers/limits`, (_req, res) => res.json({ limits: globalThis.__providerLimits }));
app.get(`${API_BASE}/providers/usage`, (req, res) => {
  const windowMs = parseInt(req.query.windowMs || 60 * 60 * 1000, 10);
  const providers = ['openai', 'bedrock', 'ollama'];
  const out = providers.map(p => {
    const limit = globalThis.__providerLimits?.[p]?.rpm || 120;
    const rpm = Math.floor(Math.random() * (limit * 1.1));
    const dropRate = Math.max(0, rpm > limit ? +(((rpm - limit) / (rpm || 1))).toFixed(2) : 0);
    const p95ms = Math.floor(300 + Math.random() * 700);
    return { provider: p, rpm, limit, dropRate, p95ms, windowMs };
  });
  res.json({ items: out });
});

// ===== Router what-if simulate =============================================
app.post(`${API_BASE}/routing/simulate`, (req, res) => {
  const { route = 'codegen', model = 'gpt-4o-mini', tokens = 1500, tenant = 'acme' } = req.body || {};
  const catalogue = {
    'gpt-4o-mini': { cpm: 0.6, p95: 700, avail: 0.999 },
    'claude-3-haiku': { cpm: 0.4, p95: 650, avail: 0.997 },
    'qwen2.5-coder:14b': { cpm: 0.05, p95: 1200, avail: 0.98 },
  };
  const cat = catalogue[model] || { cpm: 0.5, p95: 800, avail: 0.995 };
  const usd = +(tokens / 1000 * cat.cpm).toFixed(3);
  const score = +(((1 / (1 + cat.cpm)) * 0.5 + (1 / (1 + cat.p95 / 1000)) * 0.3 + (cat.avail) * 0.2)).toFixed(3);
  const okBudget = usd < 2;
  const allow = okBudget && cat.avail >= 0.98;
  const rules = [
    { id: 'routing.affordability', effect: okBudget ? 'allow' : 'deny', reason: okBudget ? 'within per-call cap' : 'exceeds per-call cap' },
    { id: 'routing.availability', effect: cat.avail >= 0.98 ? 'allow' : 'deny', reason: `avail=${cat.avail}` },
  ];
  const candidates = Object.entries(catalogue).map(([m, v]) => {
    const _usd = +(tokens / 1000 * v.cpm).toFixed(3);
    const _score = +(((1 / (1 + v.cpm)) * 0.5 + (1 / (1 + v.p95 / 1000)) * 0.3 + (v.avail) * 0.2)).toFixed(3);
    return { model: m, score: _score, usd: _usd, p95: v.p95, avail: v.avail };
  }).sort((a, b) => b.score - a.score);
  res.json({ route, model, tokens, usd, score, decision: { allow, rules }, candidates });
});

// ===== Serving Alerts config + generator ===================================
globalThis.__servingAlertCfg = globalThis.__servingAlertCfg || { enabled: true, qDepthMax: 20, batchMax: 128, kvHitMin: 0.8 };
app.get(`${API_BASE}/serving/alerts/config`, (_req, res) => res.json(globalThis.__servingAlertCfg));
app.put(`${API_BASE}/serving/alerts/config`, (req, res) => {
  globalThis.__servingAlertCfg = { ...globalThis.__servingAlertCfg, ...(req.body || {}) };
  res.json({ ok: true, cfg: globalThis.__servingAlertCfg });
});
setInterval(() => {
  const cfg = globalThis.__servingAlertCfg; if (!cfg?.enabled) return;
  const pt = { qDepth: Math.floor(Math.random() * 40), batch: Math.floor(Math.random() * 256), kvHit: +(0.6 + Math.random() * 0.4).toFixed(2) };
  let title = null;
  if (pt.qDepth > cfg.qDepthMax) title = `Serving alert: qDepth ${pt.qDepth} > ${cfg.qDepthMax}`;
  else if (pt.batch > cfg.batchMax) title = `Serving alert: batch ${pt.batch} > ${cfg.batchMax}`;
  else if (pt.kvHit < cfg.kvHitMin) title = `Serving alert: kvHit ${pt.kvHit} < ${cfg.kvHitMin}`;
  if (title) {
    (globalThis.__alertEvents ||= []).push({ id: uid(), routeId: 'serving', ts: Date.now(), tenant: 'n/a', severity: 'warn', title, body: JSON.stringify(pt), kind: 'serving' });
  }
}, 25000);

// ===== Router bench + perf ==================================================
app.post(`${API_BASE}/routing/bench`, (req, res) => {
  const { route = 'codegen', models = ['gpt-4o-mini', 'claude-3-haiku', 'qwen2.5-coder:14b'], tokens = 1500 } = req.body || {};
  const out = models.map(m => ({ model: m, score: +(Math.random() * 0.4 + 0.6).toFixed(3), usd: +(tokens / 1000 * (0.05 + Math.random() * 0.7)).toFixed(3), p95: Math.floor(500 + Math.random() * 600) }));
  res.json({ route, tokens, results: out.sort((a, b) => b.score - a.score) });
});
app.get(`${API_BASE}/routing/perf`, (req, res) => {
  const route = req.query.route || 'codegen';
  const points = Array.from({ length: 24 }).map((_, i) => ({ ts: Date.now() - i * 3600e3, p95: Math.floor(600 + Math.random() * 500) })).reverse();
  res.json({ route, points });
});

// ---------- Pin history + rollback + watchdog ------------------------------
globalThis.__pinHistory = globalThis.__pinHistory || [];
app.put(`${API_BASE}/routing/pin`, (req, res) => {
  const { route, model, note } = req.body || {};
  if (!route || !model) return res.status(400).json({ error: 'route & model required' });
  const prev = globalThis.__routingPins[route];
  globalThis.__routingPins[route] = model;
  globalThis.__pinHistory.push({ ts: Date.now(), route, prevModel: prev || null, newModel: model, note, action: 'pin' });
  res.json({ ok: true });
});
app.get(`${API_BASE}/routing/pins/history`, (req, res) => {
  const route = req.query.route;
  const hist = (globalThis.__pinHistory || []).filter(x => !route || x.route === route).slice(-100).reverse();
  res.json({ history: hist });
});
app.post(`${API_BASE}/routing/rollback`, (req, res) => {
  const { route, reason } = req.body || {};
  if (!route) return res.status(400).json({ error: 'route required' });
  const hist = (globalThis.__pinHistory || []).filter(x => x.route === route);
  const last = hist[hist.length - 1];
  const prevModel = last?.prevModel || null;
  if (!prevModel) return res.status(400).json({ error: 'no previous model to rollback to' });
  const cur = globalThis.__routingPins[route];
  globalThis.__routingPins[route] = prevModel;
  globalThis.__pinHistory.push({ ts: Date.now(), route, prevModel: cur, newModel: prevModel, note: reason, action: 'rollback' });
  globalThis.__alertEvents.push({ id: uid(), routeId: 'rollback', ts: Date.now(), tenant: 'n/a', severity: 'warn', title: `Auto-rollback route ${route} to ${prevModel}`, body: reason || '' });
  res.json({ ok: true, route, model: prevModel });
});

globalThis.__watchdog = globalThis.__watchdog || { enabled: false, routes: {} };
globalThis.__watchdogEvents = globalThis.__watchdogEvents || [];
app.get(`${API_BASE}/routing/watchdog/configs`, (_req, res) => res.json(globalThis.__watchdog));
app.put(`${API_BASE}/routing/watchdog/configs`, (req, res) => {
  const b = req.body || {};
  globalThis.__watchdog = { ...globalThis.__watchdog, ...b, routes: { ...(globalThis.__watchdog.routes || {}), ...(b.routes || {}) } };
  res.json({ ok: true, watchdog: globalThis.__watchdog });
});
app.get(`${API_BASE}/routing/watchdog/events`, (_req, res) => res.json({ items: (globalThis.__watchdogEvents || []).slice(-100).reverse() }));

setInterval(() => {
  const wd = globalThis.__watchdog;
  if (!wd.enabled) return;
  for (const [route, cfg] of Object.entries(wd.routes || {})) {
    if (!cfg.enabled) continue;
    const now = Date.now();
    const dlq10m = (globalThis.__dlq || []).filter(x => now - x.ts <= 10 * 60 * 1000).length;
    const z = +(0.8 + Math.random() * 1.5).toFixed(2);
    const breachZ = cfg.maxCostZ && z >= cfg.maxCostZ;
    const breachDLQ = cfg.maxDLQ10m && dlq10m >= cfg.maxDLQ10m;
    if (breachZ || breachDLQ) {
      const reason = breachZ ? `cost z=${z} >= ${cfg.maxCostZ}` : `DLQ10m=${dlq10m} >= ${cfg.maxDLQ10m}`;
      try {
        const cur = globalThis.__routingPins[route];
        const hist = (globalThis.__pinHistory || []).filter(x => x.route === route);
        const prev = hist[hist.length - 1]?.prevModel;
        if (prev) {
          globalThis.__routingPins[route] = prev;
          globalThis.__pinHistory.push({ ts: Date.now(), route, prevModel: cur, newModel: prev, note: reason, action: 'rollback' });
          globalThis.__watchdogEvents.push({ ts: Date.now(), route, reason, kind: 'rollback' });
          globalThis.__alertEvents.push({ id: uid(), routeId: 'watchdog', ts: Date.now(), tenant: 'n/a', severity: 'warn', title: `Watchdog rolled back ${route} → ${prev}`, body: reason });
        } else {
          globalThis.__watchdogEvents.push({ ts: Date.now(), route, reason: reason + ' (no prev model)', kind: 'noop' });
        }
      } catch (e) {
        globalThis.__watchdogEvents.push({ ts: Date.now(), route, reason: 'rollback error', kind: 'error' });
      }
    }
  }
}, 30000);

// ---------- Per-model cost anomalies ---------------------------------------
app.get(`${API_BASE}/metrics/cost/models/anomalies`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const models = [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'bedrock', model: 'anthropic.claude-3-haiku' },
    { provider: 'ollama', model: 'qwen2.5-coder:14b' },
  ];
  const out = models.map(m => {
    const series = Array.from({ length: 24 }).map((_, i) => ({ ts: Date.now() - i * 3600e3, usd: +(Math.random() * 0.15 + 0.02).toFixed(3) })).reverse();
    const mean = series.reduce((a, b) => a + b.usd, 0) / (series.length || 1);
    const std = Math.sqrt(series.reduce((a, b) => a + Math.pow(b.usd - mean, 2), 0) / (series.length || 1)) || 1;
    const z = (series[series.length - 1].usd - mean) / std;
    return { tenant, ...m, mean: +mean.toFixed(3), std: +std.toFixed(3), last: series[series.length - 1].usd, z: +z.toFixed(2), series };
  });
  res.json({ items: out });
});
