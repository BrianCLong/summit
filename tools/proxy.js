#!/usr/bin/env node
/**
 * Symphony Orchestra Local Proxy
 * Provides CORS-enabled API endpoints for the React UI with security allowlisting
 */
const http = require('http');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PROXY_PORT || 8787;
const ROOT = path.resolve(__dirname, '..');

// Strict allowlist for commands
const ALLOWED_COMMANDS = [
  'just --version',
  'just help',
  'just ai-up',
  'just ai-down',
  'just ai-ping',
  'just health',
  'just symphony-status',
  'just neo4j-up',
  'just neo4j-down',
  'just neo4j-guard',
  'just rag-build',
  'just metrics-refresh',
  'just benchmark',
  'just anomaly-check',
  'just policy-adapt',
  'python3 tools/usage_burndown.py',
  'python3 tools/rag_query.py --stats',
  'python3 tools/policy_adaptive.py --stats',
  'python3 tools/anomaly_healer.py --stats',
  'tail -n 100 /tmp/litellm.log',
  'tail -n 50 logs/self_healing.jsonl',
  'ls -la status/',
  'cat status/burndown.json',
];

// HMAC-based request authentication (optional)
const HMAC_SECRET =
  process.env.SYMPHONY_HMAC_SECRET || 'symphony-local-dev-key';

function validateCommand(cmd) {
  // Exact match required - no shell injection possible
  return ALLOWED_COMMANDS.includes(cmd.trim());
}

function createHmacSignature(data, timestamp) {
  const payload = `${timestamp}:${data}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

function verifyHmacSignature(signature, data, timestamp) {
  const expected = createHmacSignature(data, timestamp);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Symphony-Timestamp, X-Symphony-Signature',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders(),
  });
  res.end(JSON.stringify(data, null, 2));
}

function textResponse(res, text, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/plain',
    ...corsHeaders(),
  });
  res.end(text);
}

function errorResponse(res, message, status = 500) {
  jsonResponse(
    res,
    { error: message, timestamp: new Date().toISOString() },
    status,
  );
}

async function execCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeout = 30000, cwd = ROOT } = options;

    const child = exec(
      cmd,
      {
        cwd,
        timeout,
        env: { ...process.env, PATH: process.env.PATH },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`Command failed: ${error.message}\nStderr: ${stderr}`),
          );
        } else {
          resolve({ stdout, stderr, success: true });
        }
      },
    );
  });
}

async function getSystemStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    services: {},
    symphony: {
      version: '1.0.0',
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development',
    },
  };

  // Check LiteLLM
  try {
    const result = await execCommand(
      'curl -s -f http://127.0.0.1:4000/v1/models',
      {
        timeout: 5000,
      },
    );
    status.services.litellm = { status: 'up', port: 4000 };
  } catch (e) {
    status.services.litellm = { status: 'down', error: e.message };
  }

  // Check Ollama
  try {
    const result = await execCommand(
      'curl -s -f http://127.0.0.1:11434/api/tags',
      {
        timeout: 5000,
      },
    );
    status.services.ollama = { status: 'up', port: 11434 };
  } catch (e) {
    status.services.ollama = { status: 'down', error: e.message };
  }

  // Check Neo4j
  try {
    const result = await execCommand('curl -s -f http://127.0.0.1:7474/', {
      timeout: 5000,
    });
    status.services.neo4j = { status: 'up', port: 7474 };
  } catch (e) {
    status.services.neo4j = { status: 'down', error: e.message };
  }

  return status;
}

async function getRagStats() {
  try {
    const statsFile = path.join(ROOT, 'rag', 'index', 'rag.duckdb');
    const exists = fs.existsSync(statsFile);

    if (!exists) {
      return { files: 0, chunks: 0, updated_at: null, status: 'not_indexed' };
    }

    const stat = fs.statSync(statsFile);
    const corpusDir = path.join(ROOT, 'rag', 'corpus');
    const corpusFiles = fs.existsSync(corpusDir)
      ? fs.readdirSync(corpusDir).filter((f) => f.endsWith('.txt')).length
      : 0;

    return {
      files: corpusFiles,
      chunks: 0, // Would need to query DuckDB for exact count
      updated_at: stat.mtime.toISOString(),
      status: 'ready',
      size_bytes: stat.size,
    };
  } catch (e) {
    return { error: e.message, status: 'error' };
  }
}

async function queryRag(question) {
  try {
    const cmd = `python3 tools/rag_query.py "${question.replace(/"/g, '\\"')}"`;
    const result = await execCommand(cmd, { timeout: 30000 });

    // Parse the response (assuming it returns the answer directly)
    return {
      answer: result.stdout.trim(),
      context: [],
      sources: [],
      query: question,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    return {
      error: e.message,
      answer:
        "RAG query failed. Make sure the RAG index is built with 'just rag-build'.",
      query: question,
      timestamp: new Date().toISOString(),
    };
  }
}

function loadPolicy() {
  try {
    const policyPath = path.join(ROOT, 'config', 'orchestration.yml');
    if (fs.existsSync(policyPath)) {
      return fs.readFileSync(policyPath, 'utf8');
    }

    // Return default policy
    return `# Symphony Orchestra Policy Configuration
env: development
kill_switch: false
max_loa:
  development: 2
  staging: 1
  production: 0

routing:
  default_strategy: "capability_weighted"
  local_first: true
  cloud_burst_threshold: 0.8

models:
  local/llama:
    enabled: true
    max_rpm: 60
    cost_per_1k_tokens: 0.0
  openrouter/anthropic:
    enabled: false
    max_rpm: 20
    cost_per_1k_tokens: 0.015

budgets:
  daily_limit_usd: 10.0
  providers:
    openrouter: 5.0
    anthropic: 3.0
`;
  } catch (e) {
    return `# Error loading policy: ${e.message}`;
  }
}

function savePolicy(policyContent) {
  try {
    const policyPath = path.join(ROOT, 'config', 'orchestration.yml');
    const configDir = path.dirname(policyPath);

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(policyPath, policyContent, 'utf8');
    return { success: true, message: 'Policy saved successfully' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getBudgetData() {
  try {
    // Try to get real burndown data
    const burndownPath = path.join(ROOT, 'status', 'burndown.json');
    let budgetData = {
      summary: { totalCost: 0, window: '24h' },
      items: [],
    };

    if (fs.existsSync(burndownPath)) {
      const burndownRaw = fs.readFileSync(burndownPath, 'utf8');
      const burndown = JSON.parse(burndownRaw);

      let totalCost = 0;
      const items = [];

      // Process daily window data
      const dailyData = burndown.windows?.d1?.per_model || {};

      for (const [model, stats] of Object.entries(dailyData)) {
        const cost = stats.cost_usd || 0;
        totalCost += cost;

        // Generate mock history for sparkline (ascending cumulative spend)
        const hist = Array.from(
          { length: 24 },
          (_, i) => (cost * (i + 1)) / 24,
        );

        items.push({
          model,
          costUsd: cost,
          tokens: stats.tokens || 0,
          remaining: `Daily cap - $${(10 - cost).toFixed(2)}`,
          resetAt: new Date(Date.now() + 86400000).toISOString(),
          hist,
        });
      }

      budgetData.summary.totalCost = totalCost;
      budgetData.items = items;
    } else {
      // Mock data when no real burndown exists
      budgetData = {
        summary: { totalCost: 2.34, window: '24h' },
        items: [
          {
            model: 'local/llama',
            costUsd: 0.0,
            tokens: 15420,
            remaining: 'No limit',
            resetAt: new Date(Date.now() + 3600000).toISOString(),
            hist: [0, 0, 0, 0, 0, 0],
          },
          {
            model: 'openrouter/anthropic/claude-3.5-sonnet',
            costUsd: 2.34,
            tokens: 8930,
            remaining: 'Daily $10 cap - $7.66',
            resetAt: new Date(Date.now() + 86400000).toISOString(),
            hist: [0.1, 0.3, 0.7, 1.2, 1.8, 2.34],
          },
        ],
      };
    }

    return budgetData;
  } catch (e) {
    return {
      summary: { totalCost: 0, window: '24h' },
      items: [],
      error: e.message,
    };
  }
}

async function createGovernanceRecord(data) {
  try {
    const { type, title, council, severity, tags, summary, detail } = data;

    // Generate governance record ID
    const timestamp = new Date();
    const recordId = `GOV-${timestamp.getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;

    // Store governance record
    const governanceDir = path.join(ROOT, 'governance');
    if (!fs.existsSync(governanceDir)) {
      fs.mkdirSync(governanceDir, { recursive: true });
    }

    const record = {
      id: recordId,
      type,
      title,
      council: council || 'General',
      severity: severity || 'Medium',
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      summary: summary || '',
      detail: detail || '',
      created_at: timestamp.toISOString(),
      status: 'open',
    };

    const recordPath = path.join(governanceDir, `${recordId}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));

    // Log to governance audit trail
    const auditPath = path.join(ROOT, 'logs', 'governance.jsonl');
    const auditEntry = {
      timestamp: timestamp.toISOString(),
      action: 'record_created',
      record_id: recordId,
      type,
      title,
      council,
    };

    fs.appendFileSync(auditPath, JSON.stringify(auditEntry) + '\n');

    return {
      id: recordId,
      html_url: `file://${recordPath}`, // In production, this would be a real URL
      created_at: timestamp.toISOString(),
      status: 'created',
    };
  } catch (e) {
    return {
      error: `Failed to create governance record: ${e.message}`,
      id: null,
      html_url: null,
    };
  }
}

async function createGitHubIssue(data) {
  try {
    const { repo, title, body, labels, assignees } = data;

    // This would integrate with GitHub API in production
    // For now, create a local representation
    const issueId = Math.floor(Math.random() * 10000);
    const timestamp = new Date().toISOString();

    // Store issue data locally
    const issuesDir = path.join(ROOT, 'issues');
    if (!fs.existsSync(issuesDir)) {
      fs.mkdirSync(issuesDir, { recursive: true });
    }

    const issue = {
      number: issueId,
      title,
      body: body || '',
      labels: labels ? labels.split(',').map((l) => l.trim()) : [],
      assignees: assignees ? assignees.split(',').map((a) => a.trim()) : [],
      repo,
      created_at: timestamp,
      state: 'open',
    };

    const issuePath = path.join(
      issuesDir,
      `${repo.replace('/', '-')}-${issueId}.json`,
    );
    fs.writeFileSync(issuePath, JSON.stringify(issue, null, 2));

    return {
      number: issueId,
      html_url: `file://${issuePath}`, // In production: https://github.com/${repo}/issues/${issueId}
      created_at: timestamp,
      state: 'open',
      title,
    };
  } catch (e) {
    return {
      error: `Failed to create GitHub issue: ${e.message}`,
      html_url: null,
    };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  console.log(`${new Date().toISOString()} ${method} ${url.pathname}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders());
    res.end();
    return;
  }

  try {
    // Parse request body for POST/PUT
    let body = '';
    if (method === 'POST' || method === 'PUT') {
      for await (const chunk of req) {
        body += chunk.toString();
      }
    }

    // Route handlers
    switch (url.pathname) {
      case '/status.json':
      case '/status':
        if (method === 'GET') {
          const status = await getSystemStatus();
          jsonResponse(res, status);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/run':
        if (method === 'POST') {
          const { cmd } = JSON.parse(body || '{}');

          if (!validateCommand(cmd)) {
            errorResponse(res, `Command not allowed: ${cmd}`, 403);
            return;
          }

          try {
            const result = await execCommand(cmd);
            jsonResponse(res, {
              command: cmd,
              stdout: result.stdout,
              stderr: result.stderr,
              success: true,
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            jsonResponse(
              res,
              {
                command: cmd,
                stdout: '',
                stderr: e.message,
                success: false,
                timestamp: new Date().toISOString(),
              },
              200,
            ); // Still 200, but success: false
          }
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/rag/stats':
        if (method === 'GET') {
          const stats = await getRagStats();
          jsonResponse(res, stats);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/rag/query':
        if (method === 'POST') {
          const { q, question } = JSON.parse(body || '{}');
          const query = q || question || '';

          if (!query.trim()) {
            errorResponse(res, 'Question is required', 400);
            return;
          }

          const result = await queryRag(query);
          jsonResponse(res, result);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/policy':
        if (method === 'GET') {
          const policy = loadPolicy();
          textResponse(res, policy);
        } else if (method === 'PUT') {
          const result = savePolicy(body);
          jsonResponse(res, result, result.success ? 200 : 500);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/models':
        if (method === 'GET') {
          try {
            // Try to get models from LiteLLM
            const result = await execCommand(
              'curl -s http://127.0.0.1:4000/v1/models',
            );
            const modelsData = JSON.parse(result.stdout);
            jsonResponse(res, modelsData);
          } catch (e) {
            jsonResponse(res, {
              data: [],
              error: 'LiteLLM not available',
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/logs':
        if (method === 'GET') {
          const tail = url.searchParams.get('tail') || '50';
          const logFile = url.searchParams.get('file') || '/tmp/litellm.log';

          try {
            const cmd = `tail -n ${parseInt(tail)} ${logFile}`;
            const result = await execCommand(cmd);

            const logs = result.stdout
              .split('\n')
              .filter((line) => line.trim())
              .map((line, index) => ({
                id: index,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: line,
              }));

            jsonResponse(res, { logs, file: logFile, lines: logs.length });
          } catch (e) {
            jsonResponse(res, { logs: [], error: e.message });
          }
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/budgets':
        if (method === 'GET') {
          const budgetData = await getBudgetData();
          jsonResponse(res, budgetData);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/governance/record':
        if (method === 'POST') {
          const { type, title, council, severity, tags, summary, detail } =
            JSON.parse(body || '{}');

          if (!type || !title) {
            errorResponse(res, 'Type and title are required', 400);
            return;
          }

          const record = await createGovernanceRecord({
            type,
            title,
            council,
            severity,
            tags,
            summary,
            detail,
          });
          jsonResponse(res, record);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/github/issues':
        if (method === 'POST') {
          const {
            repo,
            title,
            body: issueBody,
            labels,
            assignees,
          } = JSON.parse(body || '{}');

          if (!repo || !title) {
            errorResponse(res, 'Repository and title are required', 400);
            return;
          }

          const issue = await createGitHubIssue({
            repo,
            title,
            body: issueBody,
            labels,
            assignees,
          });
          jsonResponse(res, issue);
        } else {
          errorResponse(res, 'Method not allowed', 405);
        }
        break;

      case '/health':
        // Simple health check
        jsonResponse(res, {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
        break;

      default:
        errorResponse(res, `Not found: ${url.pathname}`, 404);
    }
  } catch (e) {
    console.error('Request error:', e);
    errorResponse(res, `Internal server error: ${e.message}`, 500);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Symphony Proxy shutting down...');
  server.close(() => {
    console.log('✅ Symphony Proxy stopped');
    process.exit(0);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `🎭 Symphony Orchestra Proxy running on http://127.0.0.1:${PORT}`,
  );
  console.log(`📊 Status: http://127.0.0.1:${PORT}/status.json`);
  console.log(`🔍 Health: http://127.0.0.1:${PORT}/health`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /status.json     - System status');
  console.log('  POST /run            - Execute allowed commands');
  console.log('  GET  /rag/stats      - RAG index statistics');
  console.log('  POST /rag/query      - Query RAG system');
  console.log('  GET  /policy         - Get current policy');
  console.log('  PUT  /policy         - Update policy');
  console.log('  GET  /models         - List available models');
  console.log('  GET  /logs           - Tail log files');
  console.log('  GET  /health         - Health check');
});
