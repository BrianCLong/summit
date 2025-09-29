import express from 'express';
import fs from 'fs';
import path from 'path';

const memConfig: Record<string, any> = {
  REQUIRE_BUDGET_PLUGIN: process.env.REQUIRE_BUDGET_PLUGIN === 'true',
  RUNS_EXECUTE_ENABLED: process.env.RUNS_EXECUTE_ENABLED !== 'false',
  AUTONOMY_LEVEL: Number(process.env.AUTONOMY_LEVEL || '1'),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || '600'),
  BUDGET_CAP_USD: Number(process.env.BUDGET_CAP_USD || '10'),
  MAESTRO_LANGCHAIN_ENABLED: process.env.MAESTRO_LANGCHAIN_ENABLED === 'true',
  MAESTRO_COMFY_ENABLED: process.env.MAESTRO_COMFY_ENABLED === 'true',
  MODEL_PROVIDER: process.env.MODEL_PROVIDER || 'openai',
  MODEL_NAME: process.env.MODEL_NAME || process.env.MODEL_DEFAULT || 'gpt-4-turbo-preview',
  TEMPERATURE: Number(process.env.TEMPERATURE ?? 0.2),
  TOP_P: Number(process.env.TOP_P ?? 1.0),
  MAX_TOKENS: Number(process.env.MAX_TOKENS || process.env.TOKEN_CEILING || 4096),
  TENANT_DEFAULTS: JSON.parse(process.env.TENANT_DEFAULTS || '{}') as Record<string, any>,
  TENANT_OVERRIDES: {} as Record<string, Partial<any>>,
};

// Valid model providers
const VALID_PROVIDERS = ['openai', 'anthropic', 'gemini', 'oss', 'local'];

// Validation functions
function validateConfig(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.MODEL_PROVIDER && !VALID_PROVIDERS.includes(config.MODEL_PROVIDER)) {
    errors.push(`Invalid MODEL_PROVIDER. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
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
      errors.push('Budget cap exceeds policy limit of $100 when REQUIRE_BUDGET_PLUGIN is enabled');
    }
  }

  return { isValid: errors.length === 0, errors };
}

const router = express.Router();

router.get('/admin/config', (req, res) => {
  const tenantId = (req.query.tenantId as string) || '';
  if (tenantId && memConfig.TENANT_OVERRIDES && memConfig.TENANT_OVERRIDES[tenantId]) {
    return res.json({ ...memConfig, ...memConfig.TENANT_OVERRIDES[tenantId] });
  }
  res.json(memConfig);
});

router.post('/admin/config', express.json(), (req, res) => {
  const tenantId = (req.query.tenantId as string) || '';
  const allowed = Object.keys(memConfig).filter((k) => !['TENANT_OVERRIDES', 'TENANT_DEFAULTS'].includes(k));
  
  // Validate the incoming configuration
  const validation = validateConfig(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      ok: false,
      errors: validation.errors
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
      message: `Configuration updated for tenant: ${tenantId}`
    });
  } else {
    // Update global configuration
    for (const k of allowed) {
      if (k in req.body) {
        memConfig[k] = req.body[k];
      }
    }
    
    return res.json({ 
      ok: true, 
      config: memConfig,
      message: 'Global configuration updated'
    });
  }
});

// Add endpoint to manage tenant defaults
router.post('/admin/tenant-defaults', express.json(), (req, res) => {
  const { tenantId, config } = req.body;
  
  if (!tenantId) {
    return res.status(400).json({
      ok: false,
      error: 'tenantId is required'
    });
  }
  
  const validation = validateConfig(config);
  if (!validation.isValid) {
    return res.status(400).json({
      ok: false,
      errors: validation.errors
    });
  }
  
  memConfig.TENANT_DEFAULTS[tenantId] = config;
  
  res.json({
    ok: true,
    message: `Tenant defaults updated for: ${tenantId}`,
    tenantDefaults: memConfig.TENANT_DEFAULTS
  });
});

// Get all tenant defaults
router.get('/admin/tenant-defaults', (req, res) => {
  res.json({
    tenantDefaults: memConfig.TENANT_DEFAULTS
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
    return res.json({ allowedPrefixes: ['integration/'], deniedPrefixes: ['deploy/', 'db/'], allowedFlows: [] });
  }
});

router.post('/admin/n8n-flows', express.json(), (req, res) => {
  const body = req.body || {};
  const allowedPrefixes = Array.isArray(body.allowedPrefixes) ? body.allowedPrefixes : ['integration/'];
  const deniedPrefixes = Array.isArray(body.deniedPrefixes) ? body.deniedPrefixes : ['deploy/', 'db/'];
  const allowedFlows = Array.isArray(body.allowedFlows) ? body.allowedFlows.filter((s: any) => typeof s === 'string') : [];
  const out = { allowedPrefixes, deniedPrefixes, allowedFlows };
  try {
    fs.mkdirSync(path.dirname(n8nCfgPath), { recursive: true });
    fs.writeFileSync(n8nCfgPath, JSON.stringify(out, null, 2) + '\n');
    return res.json({ ok: true, config: out });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'failed to write config' });
  }
});
