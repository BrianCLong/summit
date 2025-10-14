'use strict';

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { runHelloPipeline } = require('./pipeline');

async function execCommand(command, args, { capture = false, cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    if (!capture) {
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
        }
      });
      return;
    }

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`${command} ${args.join(' ')} exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function pollWithStatus(checkFn, {
  timeoutMs = 20000,
  intervalMs = 1500,
  label = 'check',
  logger = console,
} = {}) {
  const start = Date.now();
  const errors = [];
  let attempts = 0;

  while (Date.now() - start < timeoutMs) {
    attempts += 1;
    try {
      const result = await checkFn();
      if (logger?.info) {
        const elapsed = Date.now() - start;
        logger.info(
          `[${label}] healthy after ${attempts} attempt${attempts === 1 ? '' : 's'} (${elapsed}ms)`,
        );
      }
      return { result, attempts, elapsedMs: Date.now() - start, errors };
    } catch (error) {
      errors.push({ attempt: attempts, message: error.message });
      if (logger?.warn) {
        logger.warn(`[${label}] attempt ${attempts} failed: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const timeoutError = new Error(`Timeout while waiting for ${label}`);
  timeoutError.attempts = attempts;
  timeoutError.errors = errors;
  if (logger?.error) {
    logger.error(timeoutError, `[${label}] did not become healthy`);
  }
  throw timeoutError;
}

async function runSmokeTest({ composeFile, reportPath, logger = console }) {
  const startTime = Date.now();
  const steps = [];
  let logsTail = '';
  let pipelineResult = null;
  let promTargets = [];
  let metricsSample = '';
  let jaegerServices = [];

  try {
    const upStart = Date.now();
    await execCommand('docker', ['compose', '-f', composeFile, 'up', '-d', '--build', '--remove-orphans', '--wait', '--wait-timeout', '120']);
    steps.push({ name: 'compose_up', status: 'ok', durationMs: Date.now() - upStart });

    const pipelineStart = Date.now();
    pipelineResult = await runHelloPipeline({ endpoint: 'http://localhost:4000/graphql', token: 'dev-token' });
    steps.push({
      name: 'hello_pipeline',
      status: 'ok',
      durationMs: Date.now() - pipelineStart,
      details: {
        investigationId: pipelineResult.investigation?.id || null,
        entityId: pipelineResult.createdEntity?.id || null,
      },
    });

    const logsStart = Date.now();
    const logs = await execCommand('docker', ['compose', '-f', composeFile, 'logs', 'api', '--tail', '150'], { capture: true });
    logsTail = logs.stdout.trim();
    steps.push({ name: 'api_logs', status: 'ok', durationMs: Date.now() - logsStart });

    const jaegerStart = Date.now();
    const {
      result: jaegerResponse,
      attempts: jaegerAttempts,
    } = await pollWithStatus(
      () => fetchJson('http://localhost:16686/api/services'),
      { timeoutMs: 20000, intervalMs: 2000, label: 'jaeger', logger },
    );
    jaegerServices = Array.isArray(jaegerResponse.data) ? jaegerResponse.data : [];
    const jaegerOk = jaegerServices.includes('intelgraph-api');
    steps.push({
      name: 'jaeger_services',
      status: jaegerOk ? 'ok' : 'fail',
      durationMs: Date.now() - jaegerStart,
      services: jaegerServices,
      attempts: jaegerAttempts,
    });

    const metricsStart = Date.now();
    const {
      result: metricsResult,
      attempts: metricsAttempts,
    } = await pollWithStatus(
      () => fetchText('http://localhost:9464/metrics'),
      { timeoutMs: 15000, intervalMs: 2000, label: 'otel-metrics', logger },
    );
    metricsSample = metricsResult;
    const metricsOk = metricsSample.includes('http_requests_total');
    steps.push({
      name: 'api_metrics',
      status: metricsOk ? 'ok' : 'fail',
      durationMs: Date.now() - metricsStart,
      attempts: metricsAttempts,
    });

    try {
      const targets = await fetchJson('http://localhost:9090/api/v1/targets');
      promTargets = (targets.data?.activeTargets || []).map((target) => target.labels?.job || target.labels?.service || target.scrapeUrl);
      steps.push({ name: 'prometheus_targets', status: 'ok', durationMs: 0, targets: promTargets });
    } catch (error) {
      if (logger?.warn) {
        logger.warn(`[prometheus] failed to fetch targets: ${error.message}`);
      }
      steps.push({ name: 'prometheus_targets', status: 'warn', durationMs: 0, error: error.message });
    }
  } catch (error) {
    steps.push({ name: 'smoke', status: 'fail', error: error.message });
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;
    const report = {
      startedAt: new Date(startTime).toISOString(),
      durationMs,
      steps,
      pipeline: pipelineResult,
      jaegerServices,
      prometheusTargets: promTargets,
      logsTail: logsTail.split('\n').slice(-120).join('\n'),
      metricsSample: metricsSample.slice(0, 800),
    };
    if (reportPath) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }
    return report;
  }
}

module.exports = {
  runSmokeTest,
};
