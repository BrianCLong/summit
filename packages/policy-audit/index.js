const { spawn } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { once } = require('events');
const { resolveOpa } = require('./opa');

const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const DEFAULT_HEALTH_TIMEOUT_MS = 15000;

class PolicyAudit {
  constructor(opts = {}) {
    this.policyDir = path.resolve(opts.policyDir || path.join(__dirname, '../contracts/policy'));
    this.auditDir = path.resolve(opts.auditDir || path.join(__dirname, '../audit'));
    this._opaOpts = {
      opaPath: opts.opaPath,
      opaUrl: opts.opaUrl,
      opaSha256: opts.opaSha256,
    };
    this._healthTimeout = opts.healthTimeout || DEFAULT_HEALTH_TIMEOUT_MS;
    this._requestTimeout = opts.requestTimeout || DEFAULT_REQUEST_TIMEOUT_MS;
    this._explicitBaseUrl = (opts.baseUrl || process.env.POLICY_API_URL || '').trim() || null;
    this._opaPromise = null;
    this._opaProcess = null;
    this._opaBaseUrl = this._explicitBaseUrl ? sanitizeBaseUrl(this._explicitBaseUrl) : null;
    this._cleanupBound = false;
  }

  async evaluate(input) {
    const baseUrl = await this.baseUrl();
    return httpEvaluate(baseUrl, input, this._requestTimeout);
  }

  async evaluateAndAudit(input) {
    const result = await this.evaluate(input);
    await this.audit({
      decision: result.allow ? 'allow' : 'deny',
      reason: result.reason,
      subject: input.subject,
      resource: input.resource,
    });
    return result;
  }

  async audit(entry) {
    if (!entry?.decision || !entry?.reason || !entry?.subject || !entry?.resource) {
      throw new Error('decision, reason, subject, and resource required');
    }
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(this.auditDir, `audit-${date}.log`);
    const prevHash = await this._lastHash(file);
    const id = crypto.randomUUID();
    const record = { id, timestamp: new Date().toISOString(), ...entry, prevHash };
    const hash = crypto.createHash('sha256').update(prevHash + JSON.stringify(record)).digest('hex');
    record.hash = hash;
    await fsp.mkdir(this.auditDir, { recursive: true });
    await fsp.appendFile(file, JSON.stringify(record) + '\n');
    return id;
  }

  async baseUrl() {
    if (this._opaBaseUrl) return this._opaBaseUrl;
    if (!this._opaPromise) {
      this._opaPromise = this._explicitBaseUrl
        ? Promise.resolve(this._opaBaseUrl)
        : this._startOpa();
    }
    const url = await this._opaPromise;
    this._opaBaseUrl = url;
    return url;
  }

  async close() {
    if (this._opaProcess) {
      this._opaProcess.kill('SIGTERM');
      try {
        await once(this._opaProcess, 'exit');
      } catch (err) {
        if (err?.name !== 'AbortError') {
          // ignore other errors on shutdown
        }
      }
    }
    this._opaProcess = null;
    this._opaPromise = null;
    this._opaBaseUrl = this._explicitBaseUrl ? sanitizeBaseUrl(this._explicitBaseUrl) : null;
  }

  async _lastHash(file) {
    try {
      const content = await fsp.readFile(file, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (!lines.length) return '';
      return JSON.parse(lines[lines.length - 1]).hash;
    } catch {
      return '';
    }
  }

  async _startOpa() {
    const opaPath = await resolveOpa(this._opaOpts);
    const port = await getAvailablePort();
    const addr = `127.0.0.1:${port}`;
    const child = spawn(opaPath, ['run', '--server', '--addr', addr, this.policyDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this._opaProcess = child;
    if (!this._cleanupBound) {
      this._cleanupBound = true;
      process.on('exit', () => {
        if (this._opaProcess) {
          this._opaProcess.kill('SIGTERM');
        }
      });
    }
    child.on('exit', () => {
      this._opaProcess = null;
      this._opaPromise = null;
      if (!this._explicitBaseUrl) {
        this._opaBaseUrl = null;
      }
    });
    const baseUrl = `http://${addr}`;
    await waitForHealth(baseUrl, this._healthTimeout);
    return baseUrl;
  }
}

function sanitizeBaseUrl(url) {
  return url.replace(/\/$/, '');
}

async function waitForHealth(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/health`, { method: 'GET' }, 1000);
      if (res.ok) return;
      lastError = new Error(`OPA health check returned ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await delay(100);
  }
  const message = lastError ? lastError.message : 'OPA server did not become healthy';
  throw new Error(`Failed to start OPA server: ${message}`);
}

async function httpEvaluate(baseUrl, input, timeoutMs) {
  const response = await fetchWithTimeout(
    `${baseUrl}/v1/data/policy/decision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    },
    timeoutMs,
  );
  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(`OPA HTTP ${response.status}: ${text || response.statusText}`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw new Error(`OPA returned invalid JSON: ${err.message}`);
  }
  if (!payload || typeof payload.result !== 'object') {
    throw new Error('OPA response missing result field');
  }
  const { allow = false, reason = 'unknown' } = payload.result;
  return { allow: Boolean(allow), reason };
}

async function fetchWithTimeout(url, init, timeoutMs) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is not available');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function verifyAuditChain(file) {
  if (!fs.existsSync(file)) return true;
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  let prev = '';
  for (const line of lines) {
    const item = JSON.parse(line);
    const { hash, ...rest } = item;
    const calc = crypto.createHash('sha256').update(prev + JSON.stringify(rest)).digest('hex');
    if (hash !== calc) return false;
    prev = hash;
  }
  return true;
}

function verifyAuditChainDetailed(file) {
  if (!fs.existsSync(file)) return { valid: true, index: -1 };
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  let prev = '';
  for (let i = 0; i < lines.length; i++) {
    const item = JSON.parse(lines[i]);
    const { hash, ...rest } = item;
    const calc = crypto.createHash('sha256').update(prev + JSON.stringify(rest)).digest('hex');
    if (hash !== calc) return { valid: false, index: i };
    prev = hash;
  }
  return { valid: true, index: lines.length - 1 };
}

module.exports = { PolicyAudit, verifyAuditChain, verifyAuditChainDetailed };
