import { fileURLToPath } from 'node:url';

import express from 'express';
import { graphqlHTTP } from 'express-graphql';

import { normalizeCaps } from 'common-types';
import { PolicyEngine } from 'policy';
import { ModelRegistry } from './adapters/registry.js';
import { schema, buildRoot } from './graphql/schema.js';
import {
  observePolicyDeny,
  observeSuccess,
  registry as metricsRegistry,
} from './metrics.js';
import { InMemoryLedger, buildEvidencePayload } from 'prov-ledger';

const ALLOWED_PURPOSES = new Set([
  'investigation',
  'threat-intel',
  'fraud-risk',
  't&s',
  'benchmarking',
  'training',
  'demo',
]);

const defaultPolicyPath = fileURLToPath(
  new URL('../../policy/config/router.yaml', import.meta.url),
);

class PolicyError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message ?? code);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function buildTenantKey(context) {
  return `${context.tenant}:${context.caseId}`;
}

function mergeCaps(baseCaps, overrideCaps) {
  return normalizeCaps({ ...baseCaps, ...overrideCaps });
}

function buildPlanArtifacts(input, decision, evaluation) {
  const summary = `Plan for "${input.objective}" routed to ${decision.model.id} (license: ${decision.model.license}).`;
  const backlog = [
    '1. Finalize policy router & OPA gate aligned to tenant guardrails.',
    '2. Wire adapters, cost meter, and provenance ledger for the selected model.',
    '3. Publish dashboards, alerts, and rollback playbook with evidence bundle.',
  ].join('\n');
  const adr = decision.appliedRule
    ? `ADR: Policy rule "${decision.appliedRule}" triggered ${decision.model.id}.`
    : `ADR: Defaulted to ${decision.model.id} via local-first strategy.`;
  const policy =
    `Caps → hard: ${decision.caps.hardUsd.toFixed(2)}, soft: ${decision.caps.softPct}%` +
    (evaluation?.softHit ? ' (soft cap reached)' : '') +
    `. Token cap: ${decision.caps.tokenCap}.`;
  return { summary, backlog, adr, policy };
}

function buildGenerateArtifacts(input, adapterResult, decision, evaluation) {
  const content =
    `${adapterResult.text}\nSelected model: ${decision.model.id}.` +
    (evaluation?.softHit ? '\n[Soft cap notice: response truncated]' : '');
  return { content, citations: adapterResult.citations ?? [] };
}

function createContextMiddleware(options = {}) {
  return function contextMiddleware(req, res, next) {
    const tenant = req.header('x-tenant') ?? options.defaultTenant;
    if (!tenant) {
      return res.status(400).json({ error: 'TENANT_REQUIRED' });
    }
    const purpose =
      req.header('x-purpose') ?? options.defaultPurpose ?? 'investigation';
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return res.status(403).json({ error: 'PURPOSE_NOT_ALLOWED', purpose });
    }
    const caseId = req.header('x-case') ?? 'unspecified-case';
    const environment = req.header('x-env') ?? options.defaultEnv ?? 'staging';
    const retention = req.header('x-retention') ?? 'standard-365d';
    const allowPaidHeader = req.header('x-allow-paid');
    const allowPaid = allowPaidHeader === 'true' || allowPaidHeader === '1';
    const acceptanceBlockedHeader = req.header('x-acceptance-blocked');
    const acceptanceBlocked =
      acceptanceBlockedHeader === 'true' || acceptanceBlockedHeader === '1';
    const gpuBusy = Number.parseFloat(req.header('x-gpu-busy') ?? '0');
    const caps = {};
    const costCapHeader = req.header('x-cost-cap-usd');
    if (costCapHeader && !Number.isNaN(Number(costCapHeader))) {
      caps.hardUsd = Number(costCapHeader);
    }
    req.aiContext = {
      tenant,
      caseId,
      environment,
      purpose,
      retention,
      allowPaid,
      acceptanceBlocked,
      gpuBusyRatio: Number.isFinite(gpuBusy) ? Math.max(0, gpuBusy) : 0,
      caps,
    };
    next();
  };
}

function parseToolSchema(toolSchemaJson) {
  if (!toolSchemaJson) {
    return undefined;
  }
  try {
    return JSON.parse(toolSchemaJson);
  } catch (error) {
    throw new PolicyError(
      400,
      'INVALID_TOOL_SCHEMA',
      'toolSchemaJson is not valid JSON',
    );
  }
}

export function createApp(options = {}) {
  const policyPath = options.policyPath ?? defaultPolicyPath;
  const policyEngine =
    options.policyEngine ?? PolicyEngine.fromFile(policyPath);
  const modelRegistry = options.modelRegistry ?? new ModelRegistry();
  const ledger = options.ledger ?? new InMemoryLedger();

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(createContextMiddleware(options));

  async function executePlan(input, context) {
    if (!input?.objective) {
      throw new PolicyError(400, 'OBJECTIVE_REQUIRED', 'Objective is required');
    }
    const caps = mergeCaps(context.caps, { hardUsd: input.costCapUsd });
    const tenantKey = buildTenantKey(context);
    const snapshot = policyEngine.meter.snapshot(tenantKey);
    const decision = policyEngine.decide({
      requiresMultimodal: Boolean(input.requiresMultimodal),
      language: input.language,
      allowPaid: context.allowPaid,
      acceptanceBlocked: context.acceptanceBlocked,
      caps,
      meterUsd: snapshot.usd,
      gpuBusyRatio: context.gpuBusyRatio,
      attachments: input.sources?.map((uri) => ({ uri })) ?? [],
    });

    if (decision.status !== 'allow') {
      observePolicyDeny(decision.reason ?? 'UNKNOWN');
      throw new PolicyError(
        403,
        decision.reason ?? 'POLICY_DENY',
        'Policy blocked request',
        {
          decision,
        },
      );
    }

    const adapterResult = await modelRegistry.generate(decision.model.id, {
      mode: 'plan',
      objective: input.objective,
      language: input.language,
      attachments: input.sources?.map((uri) => ({ uri })) ?? [],
      context: context.purpose,
    });

    const evaluation = policyEngine.enforceCost(
      tenantKey,
      adapterResult,
      decision.caps,
    );
    if (evaluation.status !== 'allow') {
      observePolicyDeny(evaluation.reason ?? 'CAP_DENY');
      throw new PolicyError(
        403,
        evaluation.reason ?? 'CAP_DENY',
        'Cost cap exceeded',
        {
          evaluation,
        },
      );
    }

    const planArtifacts = buildPlanArtifacts(input, decision, evaluation);
    const evidence = ledger.record(
      buildEvidencePayload({
        tenant: context.tenant,
        caseId: context.caseId,
        environment: context.environment,
        operation: 'plan',
        request: { input, headers: { purpose: context.purpose } },
        policy: policyEngine.describe(),
        decision,
        model: decision.model,
        cost: {
          usd: adapterResult.usd,
          tokensIn: adapterResult.tokensIn,
          tokensOut: adapterResult.tokensOut,
          latencyMs: adapterResult.latencyMs,
        },
        output: planArtifacts,
      }),
    );

    observeSuccess('plan', decision.model.id, adapterResult);

    return { ...planArtifacts, evidenceId: evidence.id };
  }

  async function executeGenerate(input, context) {
    if (!input?.objective) {
      throw new PolicyError(400, 'OBJECTIVE_REQUIRED', 'Objective is required');
    }
    const caps = mergeCaps(context.caps, input.caps);
    const tenantKey = buildTenantKey(context);
    const snapshot = policyEngine.meter.snapshot(tenantKey);
    const attachments = input.attachments ?? [];
    const decision = policyEngine.decide({
      requiresMultimodal: Boolean(input.requiresMultimodal),
      language: input.language,
      allowPaid: context.allowPaid,
      acceptanceBlocked: context.acceptanceBlocked,
      caps,
      meterUsd: snapshot.usd,
      gpuBusyRatio: context.gpuBusyRatio,
      attachments,
    });

    if (decision.status !== 'allow') {
      observePolicyDeny(decision.reason ?? 'POLICY_DENY');
      throw new PolicyError(
        403,
        decision.reason ?? 'POLICY_DENY',
        'Policy blocked request',
        {
          decision,
        },
      );
    }

    const toolSchema = parseToolSchema(input.toolSchemaJson);
    const adapterResult = await modelRegistry.generate(decision.model.id, {
      mode: 'generate',
      objective: input.objective,
      language: input.language,
      attachments,
      tools: Array.isArray(toolSchema?.tools) ? toolSchema.tools : undefined,
    });

    const evaluation = policyEngine.enforceCost(
      tenantKey,
      adapterResult,
      decision.caps,
    );
    if (evaluation.status !== 'allow') {
      observePolicyDeny(evaluation.reason ?? 'CAP_DENY');
      throw new PolicyError(
        403,
        evaluation.reason ?? 'CAP_DENY',
        'Cost cap exceeded',
        {
          evaluation,
        },
      );
    }

    const artifacts = buildGenerateArtifacts(
      input,
      adapterResult,
      decision,
      evaluation,
    );
    const evidence = ledger.record(
      buildEvidencePayload({
        tenant: context.tenant,
        caseId: context.caseId,
        environment: context.environment,
        operation: 'generate',
        request: { input, headers: { purpose: context.purpose } },
        policy: policyEngine.describe(),
        decision,
        model: decision.model,
        cost: {
          usd: adapterResult.usd,
          tokensIn: adapterResult.tokensIn,
          tokensOut: adapterResult.tokensOut,
          latencyMs: adapterResult.latencyMs,
        },
        output: artifacts,
      }),
    );

    observeSuccess('generate', decision.model.id, adapterResult);

    return {
      content: artifacts.content,
      citations: artifacts.citations,
      cost: {
        tokensIn: adapterResult.tokensIn,
        tokensOut: adapterResult.tokensOut,
        usd: adapterResult.usd,
        latencyMs: adapterResult.latencyMs,
      },
      model: decision.model,
      evidenceId: evidence.id,
    };
  }

  function listModels(filter = {}) {
    const models = modelRegistry.list();
    return models.filter((model) => {
      if (typeof filter.local === 'boolean' && model.local !== filter.local) {
        return false;
      }
      if (filter.modality && !model.modality.includes(filter.modality)) {
        return false;
      }
      if (filter.family && model.family !== filter.family) {
        return false;
      }
      if (filter.license && model.license !== filter.license) {
        return false;
      }
      return true;
    });
  }

  app.use(
    '/graphql',
    graphqlHTTP((req, res) => ({
      schema,
      rootValue: buildRoot({
        plan: ({ input }) => executePlan(input, req.aiContext),
        generate: ({ input }) => executeGenerate(input, req.aiContext),
        models: ({ filter }) => listModels(filter ?? {}),
      }),
      context: { headers: req.headers, ai: req.aiContext },
      graphiql: options.enableGraphiql ?? false,
      customFormatErrorFn: (error) => {
        if (error.originalError instanceof PolicyError) {
          res.statusCode = error.originalError.statusCode;
          return {
            message: error.message,
            extensions: {
              code: error.originalError.code,
              details: error.originalError.details,
            },
          };
        }
        return {
          message: error.message,
          extensions: { code: 'INTERNAL_ERROR' },
        };
      },
    })),
  );

  app.post('/v1/plan', async (req, res) => {
    try {
      const result = await executePlan(req.body, req.aiContext);
      res.json(result);
    } catch (error) {
      if (error instanceof PolicyError) {
        return res
          .status(error.statusCode)
          .json({ error: error.code, details: error.details });
      }
      res.status(500).json({ error: 'UNEXPECTED_ERROR' });
    }
  });

  app.post('/v1/generate', async (req, res) => {
    try {
      const result = await executeGenerate(req.body, req.aiContext);
      res.json(result);
    } catch (error) {
      if (error instanceof PolicyError) {
        return res
          .status(error.statusCode)
          .json({ error: error.code, details: error.details });
      }
      res.status(500).json({ error: 'UNEXPECTED_ERROR' });
    }
  });

  app.get('/v1/models', (req, res) => {
    const filter = {
      local:
        req.query.local === 'true'
          ? true
          : req.query.local === 'false'
            ? false
            : undefined,
      modality: req.query.modality,
      family: req.query.family,
      license: req.query.license,
    };
    res.json({ models: listModels(filter) });
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  });

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', policy: policyEngine.describe() });
  });

  return { app, policyEngine, modelRegistry, ledger };
}
