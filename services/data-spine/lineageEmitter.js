const fs = require('fs');
const path = require('path');

class LineageEmitter {
  constructor(options = {}) {
    this.endpoint = options.endpoint || process.env.OPENLINEAGE_ENDPOINT;
    this.namespace = options.namespace || 'data-spine';
    this.producer = options.producer || 'https://summit-data-spine';
    this.defaultJob = options.jobName;
    this.logPath = options.logPath || path.join(__dirname, 'lineage-events.json');
    this.dlqPath = options.dlqPath || path.join(__dirname, 'lineage-events.dlq.json');
    this.timeoutMs = options.timeoutMs || 2000;
    ensureFile(this.logPath);
    ensureFile(this.dlqPath);
  }

  createRunEvent(eventType, jobName, runId, inputs = [], outputs = [], facets = {}) {
    if (!eventType) throw new Error('eventType is required');
    const job = jobName || this.defaultJob;
    if (!job) throw new Error('jobName is required');
    const eventTime = new Date().toISOString();
    return {
      eventType,
      eventTime,
      run: { runId },
      job: {
        namespace: this.namespace,
        name: job,
      },
      inputs,
      outputs,
      producer: this.producer,
      facets,
    };
  }

  async emitEvent(event) {
    if (!event?.eventType) {
      throw new Error('event payload must include eventType');
    }
    this._append(this.logPath, event);
    if (!this.endpoint) {
      return { delivered: false, reason: 'endpoint_not_configured' };
    }
    try {
      await this._sendWithRetry(event);
      return { delivered: true };
    } catch (error) {
      this._append(this.dlqPath, {
        ...event,
        error: error.message,
        failedAt: new Date().toISOString(),
      });
      return { delivered: false, reason: error.message };
    }
  }

  _append(filePath, payload) {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    existing.push(payload);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  }

  async _sendWithRetry(event) {
    const attempts = 3;
    let delay = 200;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this._send(event);
        return;
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw lastError;
  }

  async _send(event) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
  }
}

module.exports = { LineageEmitter };
