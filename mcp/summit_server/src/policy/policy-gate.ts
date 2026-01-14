import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { PolicyDecision, ToolExecutionContext, ToolSchema } from '../types.js';
import type { z } from 'zod';

const policyPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'policies.json',
);
const policies = JSON.parse(readFileSync(policyPath, 'utf-8')) as {
  version: string;
  rules: { id: string; riskTier: string; requiredScopes: string[] }[];
  breakGlass: { scope: string; maxDurationMinutes: number };
};

const toTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const now = (): number => Date.now();

const isBreakGlassValid = (context: ToolExecutionContext): boolean => {
  if (!context.breakGlass) {
    return false;
  }
  if (!context.scopes.includes(policies.breakGlass.scope)) {
    return false;
  }
  const expiresAt = toTimestamp(context.breakGlass.expiresAt);
  if (expiresAt <= now()) {
    return false;
  }
  const maxDurationMs = policies.breakGlass.maxDurationMinutes * 60 * 1000;
  return expiresAt - now() <= maxDurationMs;
};

const collectRequiredScopes = <TInput extends z.ZodTypeAny, TOutput>(
  tool: ToolSchema<TInput, TOutput>,
  riskTier: string,
): string[] => {
  const ruleScopes = policies.rules.find((rule) => rule.riskTier === riskTier)
    ?.requiredScopes;
  return Array.from(new Set([...(ruleScopes ?? []), ...tool.requiredScopes]));
};

export const evaluatePolicy = <TInput extends z.ZodTypeAny, TOutput>(
  tool: ToolSchema<TInput, TOutput>,
  context: ToolExecutionContext,
): PolicyDecision => {
  const requiredScopes = collectRequiredScopes(tool, tool.riskTier);
  const breakGlassAllowed = isBreakGlassValid(context);

  if (breakGlassAllowed) {
    return {
      decision: 'allow',
      reason: `Break-glass approved: ${context.breakGlass?.reason ?? 'unspecified'}`,
      toolId: tool.id,
      riskTier: tool.riskTier,
      scopesRequired: requiredScopes,
      scopesGranted: context.scopes,
      breakGlassUsed: true,
    };
  }

  const hasScopes = requiredScopes.every((scope) =>
    context.scopes.includes(scope),
  );
  if (!hasScopes) {
    return {
      decision: 'deny',
      reason: `Missing required scopes: ${requiredScopes.filter((scope) => !context.scopes.includes(scope)).join(', ')}`,
      toolId: tool.id,
      riskTier: tool.riskTier,
      scopesRequired: requiredScopes,
      scopesGranted: context.scopes,
      breakGlassUsed: false,
    };
  }

  return {
    decision: 'allow',
    reason: 'Policy allowlist satisfied',
    toolId: tool.id,
    riskTier: tool.riskTier,
    scopesRequired: requiredScopes,
    scopesGranted: context.scopes,
    breakGlassUsed: false,
  };
};
