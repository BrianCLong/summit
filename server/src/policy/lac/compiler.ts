import yaml from 'js-yaml';
import { createHash } from 'node:crypto';
import { encodeProgram } from './bytecode.js';
import {
  JurisdictionPolicy,
  PolicyProgram,
  PolicyRule,
  PolicySet,
  RetentionPolicy,
} from './types.js';

function assertArray<T>(value: unknown, message: string): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

function normalizeRetention(retention: any): RetentionPolicy {
  if (!retention || typeof retention !== 'object') {
    throw new Error('Retention policy must be provided.');
  }
  const { defaultMaxDays, overrides } = retention as Partial<RetentionPolicy>;
  if (typeof defaultMaxDays !== 'number' || Number.isNaN(defaultMaxDays)) {
    throw new Error('Retention policy requires a numeric defaultMaxDays.');
  }
  const normalized: RetentionPolicy = {
    defaultMaxDays,
    overrides: overrides ?? {},
  };
  return normalized;
}

function normalizeJurisdiction(jurisdiction: any): JurisdictionPolicy {
  if (!jurisdiction || typeof jurisdiction !== 'object') {
    throw new Error('Jurisdiction policy must be provided.');
  }
  const { allowed, blocked, overrides } = jurisdiction as Partial<JurisdictionPolicy>;
  if (!allowed || !Array.isArray(allowed) || allowed.length === 0) {
    throw new Error('Jurisdiction policy requires a non-empty allowed list.');
  }
  return {
    allowed,
    blocked: blocked ?? [],
    overrides: overrides ?? {},
  };
}

function normalizeRules(rules: any): PolicyRule[] {
  assertArray<PolicyRule>(rules, 'Rules must be an array.');
  return rules.map(rule => {
    const {
      id,
      operation,
      target,
      legalBasis,
      appealHint,
      requires,
      description,
    } = rule as Partial<PolicyRule>;
    if (!id || typeof id !== 'string') {
      throw new Error('Each rule requires an id.');
    }
    if (!operation || !['query', 'mutation', 'subscription'].includes(operation)) {
      throw new Error(`Rule ${id} must specify an operation type.`);
    }
    if (!target || typeof target !== 'string') {
      throw new Error(`Rule ${id} must specify a target operation name.`);
    }
    if (!legalBasis || typeof legalBasis !== 'string') {
      throw new Error(`Rule ${id} must declare a legalBasis annotation.`);
    }
    if (!appealHint || typeof appealHint !== 'string') {
      throw new Error(`Rule ${id} must provide an appealHint.`);
    }
    return {
      id,
      operation,
      target,
      legalBasis,
      appealHint,
      requires: {
        licenses: requires?.licenses ?? [],
        warrants: requires?.warrants ?? [],
        jurisdictions: requires?.jurisdictions ?? [],
        retention: requires?.retention ?? {},
      },
      description,
    } satisfies PolicyRule;
  });
}

export function parsePolicyDocument(source: string | object): PolicySet {
  const raw = typeof source === 'string' ? yaml.load(source) : source;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Unable to parse policy document.');
  }
  const policy = raw as Partial<PolicySet>;
  assertArray(policy.licenses, 'Policy must declare licenses array.');
  assertArray(policy.warrants, 'Policy must declare warrants array.');
  const retention = normalizeRetention(policy.retention);
  const jurisdiction = normalizeJurisdiction(policy.jurisdiction);
  const rules = normalizeRules(policy.rules);

  const policySet: PolicySet = {
    metadata: policy.metadata ?? {},
    licenses: policy.licenses,
    warrants: policy.warrants,
    retention,
    jurisdiction,
    rules,
  };
  return policySet;
}

export interface CompilationResult {
  policy: PolicySet;
  program: PolicyProgram;
  bytecode: Buffer;
}

export function compilePolicy(source: string | object): CompilationResult {
  const policy = parsePolicyDocument(source);
  const licenseIds = new Set(policy.licenses.map(license => license.id));
  const warrantIds = new Set(policy.warrants.map(warrant => warrant.id));

  for (const rule of policy.rules) {
    for (const license of rule.requires.licenses ?? []) {
      if (!licenseIds.has(license)) {
        throw new Error(`Rule ${rule.id} references unknown license ${license}.`);
      }
    }
    for (const warrant of rule.requires.warrants ?? []) {
      if (!warrantIds.has(warrant)) {
        throw new Error(`Rule ${rule.id} references unknown warrant ${warrant}.`);
      }
    }
  }

  const compiledAt = new Date().toISOString();
  const hash = createHash('sha256').update(JSON.stringify(policy)).digest('hex');

  const program: PolicyProgram = {
    version: 1,
    compiledAt,
    sourceHash: hash,
    policy: policy.metadata ?? {},
    licenses: policy.licenses,
    warrants: policy.warrants,
    retention: policy.retention,
    jurisdiction: policy.jurisdiction,
    rules: policy.rules,
  };

  const bytecode = encodeProgram(program);
  return { policy, program, bytecode };
}
