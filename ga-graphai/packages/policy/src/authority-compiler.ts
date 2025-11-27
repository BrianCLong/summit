import { parse } from 'yaml';
import type { PolicyEffect, PolicyObligation } from 'common-types';
import { evaluateLicense } from './license.js';

export interface AuthorityPolicySelector {
  actions?: string[];
  resources?: string[];
  authorities?: string[];
  licenses?: string[];
}

export interface AuthorityPolicyRule {
  id: string;
  effect: PolicyEffect;
  selectors: AuthorityPolicySelector;
  obligations?: PolicyObligation[];
  reason?: string;
}

export interface PolicyBundleDocument {
  version?: string;
  source?: string;
  package?: string;
  licenses?: {
    allow?: string[];
    deny?: string[];
    allowPaidOverride?: boolean;
  };
  policies: AuthorityPolicyRule[];
}

export interface LicenseVerdict {
  license: string;
  status: 'allow' | 'deny';
  reason?: string;
}

export interface OpaGuard {
  id: string;
  effect: PolicyEffect;
  selector: Required<AuthorityPolicySelector>;
  obligations: PolicyObligation[];
  rule: string;
  package: string;
  query: string;
  licenseVerdicts: LicenseVerdict[];
  reason?: string;
}

export interface GuardAuditRecord {
  guardId?: string;
  event: string;
  detail?: string;
  timestamp: string;
  source?: string;
}

export interface CompiledGuardBundle {
  guards: OpaGuard[];
  auditTrail: GuardAuditRecord[];
  summary: {
    version?: string;
    source?: string;
    generatedAt: string;
    minimizedSelectors: number;
    originalSelectors: number;
    deniedLicenses: string[];
  };
}

export interface AuthorityCompilerOptions {
  defaultPackage?: string;
  auditSink?: (entry: GuardAuditRecord) => void;
}

function dedupe(values: string[] = []): string[] {
  return Array.from(new Set(values)).sort();
}

function countSelectors(selector: AuthorityPolicySelector | Required<AuthorityPolicySelector>): number {
  return (
    (selector.actions?.length ?? 0) +
    (selector.resources?.length ?? 0) +
    (selector.authorities?.length ?? 0) +
    (selector.licenses?.length ?? 0)
  );
}

function toRegoSet(values: string[]): string {
  return `{${values.map((value) => `"${value}"`).join(', ')}}`;
}

function sanitizeRuleName(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, '_');
}

export class AuthorityLicenseCompiler {
  private readonly defaultPackage: string;
  private readonly auditSink?: AuthorityCompilerOptions['auditSink'];

  constructor(options: AuthorityCompilerOptions = {}) {
    this.defaultPackage = options.defaultPackage ?? 'policy.guard';
    this.auditSink = options.auditSink;
  }

  compileFromYaml(yamlBundle: string, source?: string): CompiledGuardBundle {
    const parsed = parse(yamlBundle) as PolicyBundleDocument;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML policy bundle');
    }
    return this.compile(parsed, source ?? parsed.source);
  }

  compile(bundle: PolicyBundleDocument, source?: string): CompiledGuardBundle {
    if (!Array.isArray(bundle.policies)) {
      throw new Error('Policy bundle must include a policies array');
    }

    const auditTrail: GuardAuditRecord[] = [];
    const deniedLicenses: string[] = [];
    let originalSelectors = 0;
    let minimizedSelectors = 0;

    const emit = (event: string, detail?: string, guardId?: string) => {
      const entry: GuardAuditRecord = {
        event,
        detail,
        guardId,
        source: source ?? bundle.source,
        timestamp: new Date().toISOString(),
      };
      auditTrail.push(entry);
      if (this.auditSink) {
        this.auditSink(entry);
      }
    };

    emit('parsed-bundle', `Loaded ${bundle.policies.length} policies`);

    const guards = bundle.policies.map((policy) => {
      originalSelectors += countSelectors(policy.selectors);
      const selector = this.minimizeSelector(policy.selectors);
      minimizedSelectors += countSelectors(selector);

      const licenseVerdicts = selector.licenses.map((license) => {
        const verdict = evaluateLicense(license, bundle.licenses);
        if (verdict.status === 'deny') {
          deniedLicenses.push(license);
          emit('license-denied', verdict.reason, policy.id);
        }
        return { license, status: verdict.status, reason: verdict.reason } satisfies LicenseVerdict;
      });

      const effectiveEffect: PolicyEffect = licenseVerdicts.some((verdict) => verdict.status === 'deny')
        ? 'deny'
        : policy.effect;

      const guard: OpaGuard = {
        id: policy.id,
        effect: effectiveEffect,
        selector,
        obligations: policy.obligations ?? [],
        rule: `${sanitizeRuleName(policy.id)}_guard`,
        package: bundle.package ?? this.defaultPackage,
        query: this.buildSelectorExpression(selector),
        licenseVerdicts,
        reason: policy.reason,
      };

      emit('compiled-guard', guard.query, policy.id);
      return guard;
    });

    const summary = {
      version: bundle.version,
      source: source ?? bundle.source,
      generatedAt: new Date().toISOString(),
      minimizedSelectors,
      originalSelectors,
      deniedLicenses: Array.from(new Set(deniedLicenses)),
    };

    emit('completed', `Minimized selectors from ${originalSelectors} to ${minimizedSelectors}`);

    return { guards, auditTrail, summary };
  }

  private minimizeSelector(selector: AuthorityPolicySelector): Required<AuthorityPolicySelector> {
    return {
      actions: dedupe(selector.actions),
      resources: dedupe(selector.resources),
      authorities: dedupe(selector.authorities),
      licenses: dedupe(selector.licenses),
    };
  }

  private buildSelectorExpression(selector: Required<AuthorityPolicySelector>): string {
    const clauses: string[] = [];
    if (selector.actions.length > 0) {
      clauses.push(`input.action in ${toRegoSet(selector.actions)}`);
    }
    if (selector.resources.length > 0) {
      clauses.push(`input.resource in ${toRegoSet(selector.resources)}`);
    }
    if (selector.authorities.length > 0) {
      clauses.push(`some role; role in input.context.roles; role in ${toRegoSet(selector.authorities)}`);
    }
    if (selector.licenses.length > 0) {
      clauses.push(`input.license in ${toRegoSet(selector.licenses)}`);
    }
    return clauses.length > 0 ? clauses.join(' ; ') : 'true';
  }
}
