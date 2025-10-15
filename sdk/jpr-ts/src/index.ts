import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import yaml from 'yaml';
import { CompiledEngine, CompiledRule, Decision, EvaluationInput, Explanation, RuleTrace } from './types';

export interface BindingOptions {
  policiesPath: string;
  cliCommand?: string[];
  cliCwd?: string;
}

interface CacheEntry {
  compiled: CompiledEngine;
  expiresAt: number;
}

export class JurisdictionalPolicyResolver {
  private readonly options: BindingOptions;
  private cacheEntry?: CacheEntry;

  constructor(options: BindingOptions) {
    if (!options.policiesPath) {
      throw new Error('policiesPath is required');
    }
    this.options = {
      cliCommand: ['go', 'run', './cmd/jprcli'],
      cliCwd: path.resolve(__dirname, '..', '..', '..', 'jpr'),
      ...options
    };
  }

  can(input: EvaluationInput): Decision {
    const engine = this.ensureEngine();
    return evaluate(engine, input).decision;
  }

  explain(input: EvaluationInput): Explanation {
    const engine = this.ensureEngine();
    return evaluate(engine, input);
  }

  refresh(): void {
    this.cacheEntry = undefined;
  }

  private ensureEngine(): CompiledEngine {
    const etag = this.computeEtag();
    if (this.cacheEntry && this.cacheEntry.compiled.etag === etag && Date.now() < this.cacheEntry.expiresAt) {
      return this.cacheEntry.compiled;
    }
    const compiled = this.compileWithGo();
    const ttlMs = Math.max(compiled.ttl / 1_000_000, 0);
    this.cacheEntry = {
      compiled,
      expiresAt: Date.now() + ttlMs
    };
    return compiled;
  }

  private compileWithGo(): CompiledEngine {
    const command = this.options.cliCommand ?? ['go', 'run', './cmd/jprcli'];
    const [exec, ...args] = command;
    const finalArgs = [...args, '--policies', this.options.policiesPath, '--mode', 'compile'];
    const result = spawnSync(exec, finalArgs, {
      cwd: this.options.cliCwd,
      encoding: 'utf8'
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`jpr cli failed: ${result.stderr}`);
    }
    try {
      return JSON.parse(result.stdout) as CompiledEngine;
    } catch (err) {
      throw new Error(`failed to parse CLI output: ${err}`);
    }
  }

  private computeEtag(): string {
    const source = readFileSync(this.options.policiesPath, 'utf8');
    const parsed = yaml.parse(source);
    const h = crypto.createHash('sha256');
    h.update(JSON.stringify(parsed));
    return h.digest('hex');
  }
}

function evaluate(engine: CompiledEngine, input: EvaluationInput): Explanation {
  const keyCandidates = buildKeyCandidates(input);
  const traces: RuleTrace[] = [];
  const decisionTime = input.decisionTime ?? new Date();
  for (const key of keyCandidates) {
    const indexes = engine.index[key];
    if (!indexes) {
      continue;
    }
    for (const idx of indexes) {
      const rule = engine.rules[idx];
      const { matched, reason } = evaluateRule(rule, input, decisionTime);
      const trace: RuleTrace = {
        policyId: rule.policyId,
        priority: rule.priority,
        effect: rule.effect,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        matched,
        reason
      };
      traces.push(trace);
      if (matched) {
        const decision: Decision = {
          allowed: rule.effect === 'allow',
          effect: rule.effect,
          policyId: rule.policyId,
          evaluated: decisionTime.toISOString(),
          reason,
          matchedKey: key
        };
        return { decision, chain: traces };
      }
    }
  }

  const decision: Decision = {
    allowed: engine.defaultEffect === 'allow',
    effect: engine.defaultEffect,
    policyId: '',
    evaluated: decisionTime.toISOString(),
    reason: `default-effect:${engine.defaultEffect}`,
    matchedKey: ''
  };
  return { decision, chain: traces };
}

function buildKeyCandidates(input: EvaluationInput): string[] {
  const jurisdiction = input.jurisdiction || '*';
  const dataClass = input.dataClass || '*';
  const purpose = input.purpose || '*';
  const action = input.action;
  if (!action) {
    throw new Error('action is required');
  }
  return [
    `${jurisdiction}|${dataClass}|${purpose}|${action}`,
    `${jurisdiction}|*|${purpose}|${action}`,
    `${jurisdiction}|${dataClass}|*|${action}`,
    `${jurisdiction}|*|*|${action}`,
    `*|${dataClass}|${purpose}|${action}`,
    `*|*|${purpose}|${action}`,
    `*|${dataClass}|*|${action}`,
    `*|*|*|${action}`
  ];
}

function evaluateRule(rule: CompiledRule, input: EvaluationInput, when: Date): { matched: boolean; reason: string } {
  if (!withinRange(rule.effectiveFrom, rule.effectiveTo, when)) {
    return { matched: false, reason: `out-of-range:${rule.effectiveFrom}-${rule.effectiveTo}` };
  }
  if (!matchesValue(rule.jurisdiction, input.jurisdiction)) {
    return { matched: false, reason: `jurisdiction-mismatch:${input.jurisdiction}` };
  }
  if (!matchesValue(rule.dataClass, input.dataClass)) {
    return { matched: false, reason: `data-class-mismatch:${input.dataClass}` };
  }
  if (!matchesValue(rule.purpose, input.purpose)) {
    return { matched: false, reason: `purpose-mismatch:${input.purpose}` };
  }

  const facts = input.facts ?? {};
  const traits = input.traits ?? {};
  if (rule.conditions) {
    for (const [field, expected] of Object.entries(rule.conditions)) {
      const actual = facts[field] ?? traits[field];
      if (actual !== expected) {
        return { matched: false, reason: `condition-mismatch:${field}` };
      }
    }
  }

  if (rule.overrides) {
    for (const value of rule.overrides) {
      if (value === input.dataClass || value === input.jurisdiction || value === input.purpose) {
        return { matched: false, reason: `override-suppressed:${value}` };
      }
    }
  }

  return { matched: true, reason: 'matched' };
}

function withinRange(start: string, end: string, current: Date): boolean {
  const lower = toDate(start);
  const upper = toDate(end);
  if (lower && current < lower) {
    return false;
  }
  if (upper && current > upper) {
    return false;
  }
  return true;
}

function toDate(value: string): Date | undefined {
  if (!value || value.startsWith('0001-01-01')) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

function matchesValue(ruleValue: string, inputValue: string | undefined): boolean {
  if (!ruleValue || ruleValue === '*') {
    return true;
  }
  if (!inputValue) {
    return false;
  }
  return ruleValue.localeCompare(inputValue, undefined, { sensitivity: 'accent' }) === 0;
}

export * from './types';

