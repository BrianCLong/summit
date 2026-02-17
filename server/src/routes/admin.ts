import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { enableTemporal, disableTemporal } from '../temporal/control.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { authorize } from '../middleware/authorization.js';
import GAEnrollmentService from '../services/GAEnrollmentService.js';
import { getPostgresPool } from '../config/database.js';
import { clearShadowCache } from '../middleware/ShadowTrafficMiddleware.js';
import { validateSafeURL } from '../utils/input-sanitization.js';

const memConfig: Record<string, any> = {
  REQUIRE_BUDGET_PLUGIN: process.env.REQUIRE_BUDGET_PLUGIN === 'true',
  RUNS_EXECUTE_ENABLED: process.env.RUNS_EXECUTE_ENABLED !== 'false',
  AUTONOMY_LEVEL: Number(process.env.AUTONOMY_LEVEL || '1'),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || '600'),
  BUDGET_CAP_USD: Number(process.env.BUDGET_CAP_USD || '10'),
  MAESTRO_LANGCHAIN_ENABLED: process.env.MAESTRO_LANGCHAIN_ENABLED === 'true',
  MAESTRO_COMFY_ENABLED: process.env.MAESTRO_COMFY_ENABLED === 'true',
  MODEL_PROVIDER: process.env.MODEL_PROVIDER || 'openai',
  MODEL_NAME:
    process.env.MODEL_NAME ||
    process.env.MODEL_DEFAULT ||
    'gpt-4-turbo-preview',
  TEMPERATURE: Number(process.env.TEMPERATURE ?? 0.2),
  TOP_P: Number(process.env.TOP_P ?? 1.0),
  MAX_TOKENS: Number(
    process.env.MAX_TOKENS || process.env.TOKEN_CEILING || 4096,
  ),
  RESEARCH_PROMPT_ENABLED: process.env.RESEARCH_PROMPT_ENABLED === 'true',
  RESEARCH_PROMPT_PATH: process.env.RESEARCH_PROMPT_PATH || '',
  TENANT_DEFAULTS: JSON.parse(process.env.TENANT_DEFAULTS || '{}') as Record<
    string,
    any
  >,
  TENANT_OVERRIDES: {} as Record<string, Partial<any>>,
};

// Valid model providers
const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini', 'oss', 'local'];

// Validation functions
function validateConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    config.MODEL_PROVIDER &&
    !VALID_PROVIDERS.includes(config.MODEL_PROVIDER)
  ) {
    errors.push(
      `Invalid MODEL_PROVIDER. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
    );
  }

  if (config.TEMPERATURE !== undefined) {
    const temp = Number(config.TEMPERATURE);
    if (isNaN(temp) || temp < 0 || temp > 1) {
      errors.push('TEMPERATURE must be a number between 0 and 1');
    }
  }

  if (config.TOP_P !== undefined) {
    const topP = Number(config.TOP_P);
    if (isNaN(topP) || topP < 0 || topP > 1) {
      errors.push('TOP_P must be a number between 0 and 1');
    }
  }

  if (config.MAX_TOKENS !== undefined) {
    const maxTokens = Number(config.MAX_TOKENS);
    if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 100000) {
      errors.push('MAX_TOKENS must be a number between 1 and 100000');
    }
  }

  if (config.BUDGET_CAP_USD !== undefined) {
    const budget = Number(config.BUDGET_CAP_USD);
    if (isNaN(budget) || budget < 0) {
      errors.push('BUDGET_CAP_USD must be a non-negative number');
    }

    // Check against policy if budget plugin is required
    if (memConfig.REQUIRE_BUDGET_PLUGIN && budget > 100) {
      errors.push(
        'Budget cap exceeds policy limit of $100 when REQUIRE_BUDGET_PLUGIN is enabled',
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}

const router = express.Router();

router.use(ensureAuthenticated, authorize('manage_users'));

// GA Signals Endpoint
router.get('/ga/signals', async (_req, res) => {
  try {
    const config = await GAEnrollmentService.getConfig();

    // Get real-time stats
    const pool = getPostgresPool();
    const userCountRes = await pool.query('SELECT COUNT(*) FROM users');
    const tenantCountRes = await pool.query('SELECT COUNT(*) FROM tenants');

    const userCount = parseInt(userCountRes.rows[0].count, 10);
    const tenantCount = parseInt(tenantCountRes.rows[0].count, 10);

    res.json({
      config,
      stats: {
        users: {
          current: userCount,
          max: config.maxUsers,
          utilization: (userCount / config.maxUsers) * 100
        },
        tenants: {
          current: tenantCount,
          max: config.maxTenants,
          utilization: (tenantCount / config.maxTenants) * 100
        }
      },
      status: config.status
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GA Config Endpoint (Rollback/Throttle)
router.post('/ga/config', express.json(), async (req, res) => {
  try {
    const { status, maxTenants, maxUsers } = req.body;
    const updates: any = {};

    if (status) updates.status = status;
    if (maxTenants) updates.maxTenants = maxTenants;
    if (maxUsers) updates.maxUsers = maxUsers;

    await GAEnrollmentService.updateConfig(updates);

    res.json({ ok: true, config: await GAEnrollmentService.getConfig() });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/config', (req, res) => {
  const tenantId = (req.query.tenantId as string) || '';
  if (
    tenantId &&
    memConfig.TENANT_OVERRIDES &&
    memConfig.TENANT_OVERRIDES[tenantId]
  ) {
    return res.json({ ...memConfig, ...memConfig.TENANT_OVERRIDES[tenantId] });
  }
  res.json(memConfig);
});

router.post('/config', express.json(), (req, res) => {
  const tenantId = (req.query.tenantId as string) || '';
  const allowed = Object.keys(memConfig).filter(
    (k) => !['TENANT_OVERRIDES', 'TENANT_DEFAULTS'].includes(k),
  );

  // Validate the incoming configuration
  const validation = validateConfig(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      ok: false,
      errors: validation.errors,
    });
  }

  if (tenantId) {
    // Update tenant-specific configuration
    memConfig.TENANT_OVERRIDES = memConfig.TENANT_OVERRIDES || {};
    const cur = memConfig.TENANT_OVERRIDES[tenantId] || {};

    for (const k of allowed) {
      if (k in req.body) {
        cur[k] = req.body[k];
      }
    }

    memConfig.TENANT_OVERRIDES[tenantId] = cur;
    return res.json({
      ok: true,
      config: { ...memConfig, ...cur },
      message: `Configuration updated for tenant: ${tenantId}`,
    });
  } else {
    // Update global configuration
    for (const k of allowed) {
      if (k in req.body) {
        memConfig[k] = req.body[k];
        if (k === 'RESEARCH_PROMPT_ENABLED') {
          process.env.RESEARCH_PROMPT_ENABLED = memConfig[k] ? 'true' : 'false';
        }
        if (k === 'RESEARCH_PROMPT_PATH') {
          process.env.RESEARCH_PROMPT_PATH = String(memConfig[k] || '');
        }
        if (k === 'TEMPORAL_ENABLED') {
          process.env.TEMPORAL_ENABLED = memConfig[k] ? 'true' : 'false';
        }
      }
    }

    return res.json({
      ok: true,
      config: memConfig,
      message: 'Global configuration updated',
    });
  }
});

// Add endpoint to manage tenant defaults
router.post('/tenant-defaults', express.json(), (req, res) => {
  const { tenantId, config } = req.body;

  if (!tenantId) {
    return res.status(400).json({
      ok: false,
      error: 'tenantId is required',
    });
  }

  const validation = validateConfig(config);
  if (!validation.isValid) {
    return res.status(400).json({
      ok: false,
      errors: validation.errors,
    });
  }

  memConfig.TENANT_DEFAULTS[tenantId] = config;

  res.json({
    ok: true,
    message: `Tenant defaults updated for: ${tenantId}`,
    tenantDefaults: memConfig.TENANT_DEFAULTS,
  });
});

// Health check endpoint for secret rotation
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all tenant defaults
router.get('/tenant-defaults', (req, res) => {
  res.json({
    tenantDefaults: memConfig.TENANT_DEFAULTS,
  });
});

import { RegionalAvailabilityService } from '../services/RegionalAvailabilityService.js';

// Regional Failover Admin APIs
router.get('/failover/status', (req, res) => {
  const availability = RegionalAvailabilityService.getInstance();
  res.json(availability.getStatus());
});

router.post('/failover/mode', express.json(), (req, res) => {
  const { mode } = req.body;
  if (mode !== 'AUTOMATIC' && mode !== 'MANUAL_PROMOTION_ACTIVE') {
    return res.status(400).json({ ok: false, error: 'Invalid mode' });
  }
  const availability = RegionalAvailabilityService.getInstance();
  availability.setFailoverMode(mode);
  res.json({ ok: true, mode });
});

router.post('/failover/status', express.json(), (req, res) => {
  const { region, status } = req.body;
  if (!region || !['HEALTHY', 'DEGRADED', 'DOWN'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid region or status' });
  }
  try {
    const availability = RegionalAvailabilityService.getInstance();
    availability.setRegionStatus(region, status);
    res.json({ ok: true, region, status });
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// Shadow Traffic Admin APIs
router.get('/shadow/configs', async (req, res) => {
  try {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM shadow_traffic_configs');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/shadow/configs', express.json(), async (req, res) => {
  const { tenantId, targetUrl, samplingRate, compareResponses } = req.body;
  if (!tenantId || !targetUrl) {
    return res.status(400).json({ ok: false, error: 'tenantId and targetUrl are required' });
  }

  let validatedUrl: string;
  try {
    validatedUrl = await validateSafeURL(targetUrl);
  } catch (error: any) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  try {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO shadow_traffic_configs (tenant_id, target_url, sampling_rate, compare_responses)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE 
       SET target_url = EXCLUDED.target_url, 
           sampling_rate = EXCLUDED.sampling_rate, 
           compare_responses = EXCLUDED.compare_responses,
           updated_at = CURRENT_TIMESTAMP`,
      [tenantId, validatedUrl, samplingRate ?? 0, compareResponses ?? false]
    );
    clearShadowCache(tenantId);
    res.json({ ok: true, message: 'Shadow traffic config updated' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/shadow/configs/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  try {
    const pool = getPostgresPool();
    await pool.query('DELETE FROM shadow_traffic_configs WHERE tenant_id = $1', [tenantId]);
    clearShadowCache(tenantId);
    res.json({ ok: true, message: 'Shadow traffic config deleted' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;

// ESM __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// n8n flows admin (read/write server/config/n8n-flows.json)
const n8nCfgPath = path.resolve(__dirname, '../../config/n8n-flows.json');

router.get('/n8n-flows', (_req, res) => {
  try {
    const raw = fs.readFileSync(n8nCfgPath, 'utf8');
    return res.json(JSON.parse(raw));
  } catch {
    return res.json({
      allowedPrefixes: ['integration/'],
      deniedPrefixes: ['deploy/', 'db/'],
      allowedFlows: [],
    });
  }
});

router.post('/n8n-flows', express.json(), (req, res) => {
  const body = req.body || {};
  const allowedPrefixes = Array.isArray(body.allowedPrefixes)
    ? body.allowedPrefixes
    : ['integration/'];
  const deniedPrefixes = Array.isArray(body.deniedPrefixes)
    ? body.deniedPrefixes
    : ['deploy/', 'db/'];
  const allowedFlows = Array.isArray(body.allowedFlows)
    ? body.allowedFlows.filter((s: any) => typeof s === 'string')
    : [];
  const out = { allowedPrefixes, deniedPrefixes, allowedFlows };
  try {
    fs.mkdirSync(path.dirname(n8nCfgPath), { recursive: true });
    fs.writeFileSync(n8nCfgPath, JSON.stringify(out, null, 2) + '\n');
    return res.json({ ok: true, config: out });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || 'failed to write config' });
  }
});

// OPA admin utilities
router.get('/opa/validate', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    const health = await axios
      .get(`${base}/health`, { timeout: 3000 })
      .then((r: any) => r.status);
    // Optional test eval against our n8n trigger package
    let evalOk = false;
    let evalReason = '';
    try {
      const test = await axios.post(
        `${base}/v1/data/maestro/integrations/n8n/trigger`,
        {
          input: {
            tenantId: 'test',
            role: 'ADMIN',
            resource: 'integration/test',
          },
        },
        { timeout: 3000 },
      );
      evalOk = Boolean(test.data?.result?.allow ?? true);
      evalReason = String(test.data?.result?.reason ?? 'ok');
    } catch (e: any) {
      evalOk = false;
      evalReason = e?.message || 'eval failed';
    }
    return res.json({ ok: health === 200, health, evalOk, evalReason });
  } catch (e: any) {
    return res
      .status(200)
      .json({ ok: false, message: e?.message || 'OPA unreachable' });
  }
});

router.post('/opa/reload', async (_req, res) => {
  // Stub: Typically OPA data reloads are handled via bundles; provide a no-op success
  return res.json({
    ok: true,
    message: 'Reload request acknowledged (bundle-managed in production)',
  });
});

// OPA bundle source: attempt to read status plugin for bundle revision/version
router.get('/opa/bundle-source', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base) return res.json({ ok: false, message: 'OPA_BASE_URL not set' });

    const candidates = [`${base}/status`, `${base}/v1/status`];
    let result: any = null;
    for (const url of candidates) {
      try {
        const r = await axios.get(url, { timeout: 3000 });
        result = r.data;
        break;
      } catch (_) { }
    }
    if (!result)
      return res.json({ ok: false, message: 'status endpoint not available' });

    const bundles = result?.bundles || result?.plugins?.bundle?.status || {};
    const names = Object.keys(bundles);
    const info = names.slice(0, 3).map((n) => ({
      name: n,
      revision:
        bundles[n]?.revision ||
        bundles[n]?.active_revision ||
        bundles[n]?.manifest?.revision,
      last_success:
        bundles[n]?.last_successful_download?.time ||
        bundles[n]?.last_successful_activation?.time,
    }));
    return res.json({ ok: true, bundleNames: names, info });
  } catch (e: any) {
    return res.json({
      ok: false,
      message: e?.message || 'bundle source read failed',
    });
  }
});

// OPA bundle status (checks whether data.maestro.n8n.allowed_flows exists)
router.get('/opa/bundle-status', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base) return res.json({ ok: false, message: 'OPA_BASE_URL not set' });
    const r = await axios.get(`${base}/v1/data/maestro/n8n/allowed_flows`, {
      timeout: 3000,
    });
    const flows = r.data?.result || {};
    const keys = Object.keys(flows || {});
    return res.json({
      ok: true,
      allowedFlowsCount: keys.length,
      sample: keys.slice(0, 10),
    });
  } catch (e: any) {
    return res.json({ ok: false, message: e?.message || 'lookup failed' });
  }
});

// Push current n8n allowed flows into OPA data API (writes to data.maestro.n8n.allowed_flows)
router.post('/opa/push-n8n-flows', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    let cfg: any = { allowedFlows: [] };
    try {
      cfg = JSON.parse(fs.readFileSync(n8nCfgPath, 'utf8'));
    } catch { }
    const map: Record<string, boolean> = {};
    for (const f of cfg.allowedFlows || []) map[f] = true;
    await axios.put(`${base}/v1/data/maestro/n8n/allowed_flows`, map, {
      timeout: 5000,
    });
    return res.json({ ok: true, count: Object.keys(map).length });
  } catch (e: any) {
    return res
      .status(200)
      .json({ ok: false, message: e?.message || 'push failed' });
  }
});

// Sync n8n allowed flows FROM OPA into local config file
router.post('/opa/sync-n8n-flows', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    const r = await axios.get(`${base}/v1/data/maestro/n8n/allowed_flows`, {
      timeout: 5000,
    });
    const flows = r.data?.result || {};
    const allowedFlows = Object.keys(flows || {}).filter((k) => flows[k]);
    let cfg: any = {
      allowedPrefixes: ['integration/'],
      deniedPrefixes: ['deploy/', 'db/'],
      allowedFlows: [],
    };
    try {
      cfg = JSON.parse(fs.readFileSync(n8nCfgPath, 'utf8'));
    } catch { }
    const out = { ...cfg, allowedFlows };
    fs.mkdirSync(path.dirname(n8nCfgPath), { recursive: true });
    fs.writeFileSync(n8nCfgPath, JSON.stringify(out, null, 2) + '\n');
    return res.json({ ok: true, count: allowedFlows.length, config: out });
  } catch (e: any) {
    return res
      .status(200)
      .json({ ok: false, message: e?.message || 'sync failed' });
  }
});

import { SecretManager } from '../services/secretManager.js';
import { MockServiceRegistry } from '../services/serviceRegistry.js';

const secretManager = new SecretManager();
const serviceRegistry = new MockServiceRegistry();

// Secret Rotation API
router.post('/secrets/rotate', express.json(), async (req, res) => {
  const { secretName, newVersion, services } = req.body;

  if (!secretName || !newVersion || !services) {
    return res.status(400).json({ ok: false, error: 'Missing required parameters' });
  }

  console.log(`Rotating secret "${secretName}" to version "${newVersion}" for services:`, services);

  const previousSecret = await secretManager.getSecret(secretName, 'current');

  if (!previousSecret) {
    return res.status(404).json({ ok: false, error: `Secret not found: ${secretName}` });
  }

  for (const service of services) {
    console.log(`Updating secret for service: ${service}`);
    await secretManager.setSecret(secretName, 'current', (await secretManager.getSecret(secretName, newVersion as string)) as string);
    console.log(`Health check for service ${service}...`);
    const healthUrl = serviceRegistry.getServiceHealthUrl(service);
    if (!healthUrl) {
      console.error(`Health check URL not found for service: ${service}`);
      // In a real implementation, we might want to roll back here as well
      continue;
    }
    const health = await axios.get(healthUrl, { timeout: 5000 }).then(res => res.data);
    if (health.status !== 'ok') {
      console.error(`Service ${service} is unhealthy after secret rotation. Rolling back...`);
      await secretManager.setSecret(secretName, 'current', previousSecret);
      return res.status(500).json({ ok: false, error: `Service ${service} failed to restart with new secret` });
    }
    console.log(`Service ${service} is healthy.`);
  }

  res.json({ ok: true, message: 'Secret rotation completed successfully' });
});

// Temporal runtime toggle
router.post('/temporal/toggle', async (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  try {
    if (enabled) {
      await enableTemporal();
    } else {
      await disableTemporal();
    }
    (memConfig as any).TEMPORAL_ENABLED = enabled;
    process.env.TEMPORAL_ENABLED = enabled ? 'true' : 'false';
    return res.json({ ok: true, enabled });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || 'temporal toggle failed' });
  }
});

// Push prefixes (allowed/denied) to OPA
router.post('/opa/push-n8n-prefixes', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    let cfg: any = {
      allowedPrefixes: ['integration/'],
      deniedPrefixes: ['deploy/', 'db/'],
    };
    try {
      cfg = JSON.parse(fs.readFileSync(n8nCfgPath, 'utf8'));
    } catch { }
    await axios.put(
      `${base}/v1/data/maestro/n8n/allowed_prefixes`,
      (cfg.allowedPrefixes || []).reduce(
        (m: any, p: string) => ((m[p] = true), m),
        {},
      ),
      { timeout: 5000 },
    );
    await axios.put(
      `${base}/v1/data/maestro/n8n/denied_prefixes`,
      (cfg.deniedPrefixes || []).reduce(
        (m: any, p: string) => ((m[p] = true), m),
        {},
      ),
      { timeout: 5000 },
    );
    return res.json({ ok: true });
  } catch (e: any) {
    return res
      .status(200)
      .json({ ok: false, message: e?.message || 'push prefixes failed' });
  }
});

// Sync prefixes FROM OPA
router.post('/opa/sync-n8n-prefixes', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    const ar = await axios.get(`${base}/v1/data/maestro/n8n/allowed_prefixes`, {
      timeout: 5000,
    });
    const dr = await axios.get(`${base}/v1/data/maestro/n8n/denied_prefixes`, {
      timeout: 5000,
    });
    const allowedPrefixes = Object.keys(ar.data?.result || {});
    const deniedPrefixes = Object.keys(dr.data?.result || {});
    let cfg: any = {
      allowedPrefixes: [],
      deniedPrefixes: [],
      allowedFlows: [],
    };
    try {
      cfg = JSON.parse(fs.readFileSync(n8nCfgPath, 'utf8'));
    } catch { }
    const out = { ...cfg, allowedPrefixes, deniedPrefixes };
    fs.mkdirSync(path.dirname(n8nCfgPath), { recursive: true });
    fs.writeFileSync(n8nCfgPath, JSON.stringify(out, null, 2) + '\n');
    return res.json({ ok: true, config: out });
  } catch (e: any) {
    return res
      .status(200)
      .json({ ok: false, message: e?.message || 'sync prefixes failed' });
  }
});

