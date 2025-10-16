import express from 'express';
import { WebSocketServer } from 'ws';
import { createHash } from 'crypto';

import {
  BuildDistillationEngine,
  DistilledBuildSignal,
  TeacherProfile,
} from './distillation';
import { BuildEvent } from './types';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = parseInt(process.env.PORT || '3080', 10);
const distillation = new BuildDistillationEngine();

// Start server and create WebSocket
const server = app.listen(PORT, () => {
  console.log(`🏗️ Maestro Build Hub running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/api/buildhub`);
});

const wss = new WebSocketServer({
  server,
  path: '/api/buildhub',
  clientTracking: true,
});

wss.on('connection', (ws, req) => {
  const clientId = createHash('sha256')
    .update(`${req.socket.remoteAddress}${Date.now()}`)
    .digest('hex')
    .slice(0, 8);
  console.log(`🔌 Client connected: ${clientId}`);

  ws.on('close', () => {
    console.log(`🔌 Client disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Broadcast utility function
function broadcast(payload: BuildEvent) {
  const data = JSON.stringify(payload);

  console.log(
    `📡 Broadcasting build event: PR #${payload.pr}, status: ${payload.status}`,
  );

  try {
    const signal = distillation.ingest(payload);
    console.log(
      `🧪 Distilled student score for PR #${payload.pr}: ${signal.studentScore.toFixed(2)} (branch ${signal.branch})`,
    );
    pushDistillationSignal(signal);
  } catch (error) {
    console.error('Distillation ingest error:', error);
  }

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(data);
      } catch (error) {
        console.error('Failed to send data to client:', error);
      }
    }
  });
}

function pushDistillationSignal(signal: DistilledBuildSignal) {
  const message = JSON.stringify({
    type: 'distillation',
    pr: signal.pr,
    branch: signal.branch,
    studentScore: signal.studentScore,
    teacherScores: signal.teacherScores,
    recommendations: signal.recommendations,
    features: signal.features,
    timestamp: signal.timestamp,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Failed to stream distillation signal:', error);
      }
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    clients: wss.clients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Expose distilled intelligence for Maestro Fabric and other consumers
app.get('/api/distillation', (req, res) => {
  try {
    res.json(distillation.getSnapshot());
  } catch (error) {
    console.error('Distillation snapshot error:', error);
    res.status(500).json({ error: 'Unable to compute distillation snapshot' });
  }
});

app.get('/api/distillation/teachers', (_req, res) => {
  res.json(distillation.getTeachers());
});

app.post('/api/distillation/teachers', (req, res) => {
  const { id, description, weights, temperature } =
    req.body as Partial<TeacherProfile>;

  if (!id || !weights || typeof weights !== 'object') {
    return res
      .status(400)
      .json({ error: 'Teacher id and weights are required' });
  }

  const teacherWeights = weights as TeacherProfile['weights'];
  const weightKeys = Object.keys(teacherWeights);
  if (weightKeys.length === 0) {
    return res
      .status(400)
      .json({ error: 'At least one feature weight must be specified' });
  }

  const profile: TeacherProfile = {
    id,
    description: description || 'Custom teacher',
    weights: teacherWeights,
    temperature: typeof temperature === 'number' ? temperature : 1,
  };

  distillation.registerTeacher(profile);
  res.status(201).json(profile);
});

app.delete('/api/distillation/teachers/:id', (req, res) => {
  distillation.unregisterTeacher(req.params.id);
  res.sendStatus(204);
});

// GitHub webhook endpoint (add secret in repo settings)
app.post('/webhooks/github', (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];

    console.log(`📥 GitHub webhook: ${event} (${delivery})`);

    if (event === 'workflow_run') {
      const run = req.body.workflow_run;
      const pullRequests = run.pull_requests || [];

      if (pullRequests.length > 0) {
        const buildEvent: BuildEvent = {
          pr: pullRequests[0].number,
          sha: run.head_sha,
          status: mapGitHubStatus(run.conclusion, run.status),
          timestamp: run.updated_at || new Date().toISOString(),
          author: run.actor?.login,
          title: run.display_title,
          branch: run.head_branch,
          signed: run.conclusion === 'success', // Infer signing from success
          policy:
            run.conclusion === 'success'
              ? 'pass'
              : run.conclusion === 'failure'
                ? 'fail'
                : undefined,
          tests: inferTestResults(run),
        };

        broadcast(buildEvent);
      }
    }

    if (event === 'pull_request') {
      const pr = req.body.pull_request;
      const action = req.body.action;

      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        const buildEvent: BuildEvent = {
          pr: pr.number,
          sha: pr.head.sha,
          status: 'pending',
          timestamp: pr.updated_at || new Date().toISOString(),
          author: pr.user.login,
          title: pr.title,
          branch: pr.head.ref,
        };

        broadcast(buildEvent);
      }
    }

    res.sendStatus(204);
  } catch (error) {
    console.error('GitHub webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kubernetes/CI webhook endpoint
app.post('/webhooks/k8s', (req, res) => {
  try {
    const { namespace, url, sha, pr, status, image } = req.body;

    console.log(`📥 K8s webhook: ${namespace} (${status})`);

    if (namespace && namespace.startsWith('pr-')) {
      const prNumber = parseInt(namespace.replace('pr-', ''), 10);

      const buildEvent: BuildEvent = {
        pr: pr || prNumber,
        sha: sha || 'unknown',
        status: mapK8sStatus(status),
        preview: url,
        timestamp: new Date().toISOString(),
        image: image
          ? { server: image.server, client: image.client }
          : undefined,
      };

      broadcast(buildEvent);
    }

    res.sendStatus(204);
  } catch (error) {
    console.error('K8s webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SBOM/Security webhook endpoint
app.post('/webhooks/security', (req, res) => {
  try {
    const { sha, pr, sbomUrl, signed, scanResults } = req.body;

    console.log(`📥 Security webhook: PR #${pr}, signed: ${signed}`);

    const buildEvent: BuildEvent = {
      pr: parseInt(pr, 10),
      sha,
      status: 'running', // Security scans happen during build
      sbomUrl,
      signed: signed === true,
      timestamp: new Date().toISOString(),
      tests: {
        security: scanResults?.critical > 0 ? 'fail' : 'pass',
      },
    };

    broadcast(buildEvent);
    res.sendStatus(204);
  } catch (error) {
    console.error('Security webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger endpoint for testing
app.post('/api/test-event', (req, res) => {
  try {
    const buildEvent: BuildEvent = {
      pr: Math.floor(Math.random() * 1000),
      sha: createHash('sha256')
        .update(Math.random().toString())
        .digest('hex')
        .slice(0, 40),
      status: ['success', 'pending', 'failed', 'running'][
        Math.floor(Math.random() * 4)
      ] as any,
      timestamp: new Date().toISOString(),
      author: 'test-user',
      title: 'Test PR for Maestro Build HUD',
      signed: Math.random() > 0.5,
      policy: ['pass', 'warn', 'fail'][Math.floor(Math.random() * 3)] as any,
      preview: `https://pr-${Math.floor(Math.random() * 1000)}.intelgraph-preview.dev`,
      sbomUrl:
        'https://github.com/example/repo/releases/download/v1.0.0/sbom.spdx.json',
      tests: {
        unit: ['pass', 'fail', 'pending'][Math.floor(Math.random() * 3)] as any,
        e2e: ['pass', 'fail', 'pending'][Math.floor(Math.random() * 3)] as any,
        security: ['pass', 'fail', 'pending'][
          Math.floor(Math.random() * 3)
        ] as any,
      },
    };

    broadcast(buildEvent);
    res.json({ message: 'Test event sent', event: buildEvent });
  } catch (error) {
    console.error('Test event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Utility functions
function mapGitHubStatus(
  conclusion: string,
  status: string,
): BuildEvent['status'] {
  if (conclusion === 'success') return 'success';
  if (conclusion === 'failure' || conclusion === 'cancelled') return 'failed';
  if (status === 'in_progress' || status === 'queued') return 'running';
  return 'pending';
}

function mapK8sStatus(status: string): BuildEvent['status'] {
  switch (status?.toLowerCase()) {
    case 'deployed':
    case 'ready':
      return 'success';
    case 'failed':
    case 'error':
      return 'failed';
    case 'deploying':
    case 'pending':
      return 'running';
    default:
      return 'pending';
  }
}

function inferTestResults(run: any): BuildEvent['tests'] {
  const name = run.name?.toLowerCase() || '';

  return {
    unit:
      name.includes('test') && run.conclusion === 'success'
        ? 'pass'
        : name.includes('test') && run.conclusion === 'failure'
          ? 'fail'
          : 'pending',
    e2e:
      name.includes('e2e') && run.conclusion === 'success'
        ? 'pass'
        : name.includes('e2e') && run.conclusion === 'failure'
          ? 'fail'
          : 'pending',
    security:
      name.includes('security') || name.includes('scan')
        ? run.conclusion === 'success'
          ? 'pass'
          : 'fail'
        : 'pending',
  };
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Maestro Build Hub...');
  server.close(() => {
    console.log('👋 Maestro Build Hub stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down Maestro Build Hub...');
  server.close(() => {
    console.log('👋 Maestro Build Hub stopped');
    process.exit(0);
  });
});
