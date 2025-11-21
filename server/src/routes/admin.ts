import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { enableTemporal, disableTemporal } from '../temporal/control.js';
import { requireStepUp } from '../middleware/stepup.js';

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

router.get('/admin/config', (req, res) => {
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

router.post('/admin/config', requireStepUp(2), express.json(), (req, res) => {
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
router.post('/admin/tenant-defaults', express.json(), (req, res) => {
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

// Get all tenant defaults
router.get('/admin/tenant-defaults', (req, res) => {
  res.json({
    tenantDefaults: memConfig.TENANT_DEFAULTS,
  });
});

export default router;

// n8n flows admin (read/write server/config/n8n-flows.json)
const n8nCfgPath = path.resolve(__dirname, '../../config/n8n-flows.json');

router.get('/admin/n8n-flows', (_req, res) => {
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

router.post('/admin/n8n-flows', express.json(), (req, res) => {
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
router.get('/admin/opa/validate', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    const health = await axios
      .get(`${base}/health`, { timeout: 3000 })
      .then((r) => r.status);
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

router.post('/admin/opa/reload', async (_req, res) => {
  // Stub: Typically OPA data reloads are handled via bundles; provide a no-op success
  return res.json({
    ok: true,
    message: 'Reload request acknowledged (bundle-managed in production)',
  });
});

// OPA bundle source: attempt to read status plugin for bundle revision/version
router.get('/admin/opa/bundle-source', async (_req, res) => {
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
      } catch (_) {}
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
router.get('/admin/opa/bundle-status', async (_req, res) => {
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
router.post('/admin/opa/push-n8n-flows', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    let cfg: any = { allowedFlows: [] };
    try {
      cfg = JSON.parse(fs.readFileSync(n8nCfgPath, 'utf8'));
    } catch {}
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
router.post('/admin/opa/sync-n8n-flows', async (_req, res) => {
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
    } catch {}
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

// Temporal runtime toggle
router.post('/admin/temporal/toggle', express.json(), async (req, res) => {
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
router.post('/admin/opa/push-n8n-prefixes', async (_req, res) => {
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
    } catch {}
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
router.post('/admin/opa/sync-n8n-prefixes', async (_req, res) => {
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
    } catch {}
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

// OPA bundle status (checks whether data.maestro.n8n.allowed_flows exists)
router.get('/admin/opa/bundle-status', async (_req, res) => {
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
router.post('/admin/opa/push-n8n-flows', async (_req, res) => {
  try {
    const base = process.env.OPA_BASE_URL || '';
    if (!base)
      return res
        .status(200)
        .json({ ok: false, message: 'OPA_BASE_URL not set' });
    let cfg: any = { allowedFlows: [] };
    try {
      cfg = JSON.parse(fs.readFileSync(n8nCfgPath, 'utf8'));
    } catch {}
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

// Temporal runtime toggle
router.post('/admin/temporal/toggle', express.json(), async (req, res) => {
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
