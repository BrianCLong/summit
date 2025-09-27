import {
  DiffEntry,
  PolicyProgram,
  PolicyRule,
  SimulationContext,
  SimulationResult,
} from './types.js';

function findRule(program: PolicyProgram, context: SimulationContext): PolicyRule | undefined {
  return program.rules.find(rule => {
    if (rule.operation !== context.operationType) {
      return false;
    }
    return rule.target === context.operationName;
  });
}

function diffForLicenses(rule: PolicyRule, context: SimulationContext, missing: string[]): DiffEntry[] {
  if (!rule.requires.licenses || rule.requires.licenses.length === 0) {
    return [];
  }
  if (missing.length > 0) {
    return [
      {
        element: 'license',
        change: `Grant license(s): ${missing.join(', ')}`,
        impact: 'BLOCK ➜ ALLOW',
        details: 'User must present the listed licenses to proceed.',
      },
    ];
  }
  return rule.requires.licenses.map(license => ({
    element: 'license',
    change: `Revoke license ${license}`,
    impact: 'ALLOW ➜ BLOCK',
    details: 'Simulated revocation would prevent this action.',
  }));
}

function diffForWarrants(rule: PolicyRule, missing: string[]): DiffEntry[] {
  if (!rule.requires.warrants || rule.requires.warrants.length === 0) {
    return [];
  }
  if (missing.length > 0) {
    return [
      {
        element: 'warrant',
        change: `File warrant(s): ${missing.join(', ')}`,
        impact: 'BLOCK ➜ ALLOW',
        details: 'Obtain the referenced warrants or court orders.',
      },
    ];
  }
  return rule.requires.warrants.map(warrant => ({
    element: 'warrant',
    change: `Expire warrant ${warrant}`,
    impact: 'ALLOW ➜ BLOCK',
    details: 'Without this warrant the request would fail.',
  }));
}

function diffForJurisdiction(
  rule: PolicyRule,
  program: PolicyProgram,
  current: string | undefined,
  isAllowed: boolean,
): DiffEntry[] {
  const allowed = rule.requires.jurisdictions && rule.requires.jurisdictions.length > 0
    ? rule.requires.jurisdictions
    : program.jurisdiction.allowed;
  if (!current) {
    return [
      {
        element: 'jurisdiction',
        change: 'Declare jurisdiction explicitly',
        impact: isAllowed ? 'ALLOW ➜ UNKNOWN' : 'BLOCK ➜ UNKNOWN',
        details: 'Missing jurisdiction prevents automated determination.',
      },
    ];
  }
  if (isAllowed) {
    return [
      {
        element: 'jurisdiction',
        change: `Restrict jurisdiction to exclude ${current}`,
        impact: 'ALLOW ➜ BLOCK',
        details: 'Simulated restriction would block this access.',
      },
    ];
  }
  return [
    {
      element: 'jurisdiction',
      change: `Permit jurisdiction ${current}`,
      impact: 'BLOCK ➜ ALLOW',
      details: `Allowing ${current} in policy overrides would admit this query. Allowed jurisdictions: ${allowed.join(', ')}`,
    },
  ];
}

function diffForRetention(
  rule: PolicyRule,
  program: PolicyProgram,
  requested: number | null | undefined,
  isCompliant: boolean,
): DiffEntry[] {
  const limit = rule.requires.retention?.maxDays ?? program.retention.defaultMaxDays;
  if (requested == null) {
    return [
      {
        element: 'retention',
        change: 'Declare retention period',
        impact: isCompliant ? 'ALLOW ➜ UNKNOWN' : 'BLOCK ➜ UNKNOWN',
        details: 'Retention period missing; provide explicit duration in days.',
      },
    ];
  }
  if (isCompliant) {
    const tightened = Math.max(0, requested - 1);
    return [
      {
        element: 'retention',
        change: `Tighten retention to ${tightened} day(s)`,
        impact: tightened >= 0 && tightened <= limit ? 'ALLOW ➜ ALLOW' : 'ALLOW ➜ BLOCK',
        details: `Current retention ${requested} day(s) complies with ≤ ${limit}.`,
      },
    ];
  }
  return [
    {
      element: 'retention',
      change: `Reduce retention to ≤ ${limit} day(s)`,
      impact: 'BLOCK ➜ ALLOW',
      details: `Requested retention ${requested} exceeds ${limit}.`,
    },
  ];
}

function evaluateRule(
  rule: PolicyRule,
  program: PolicyProgram,
  context: SimulationContext,
): { reasons: string[]; diff: DiffEntry[] } {
  const reasons: string[] = [];
  const diff: DiffEntry[] = [];

  const requiredLicenses = new Set(rule.requires.licenses ?? []);
  const missingLicenses = Array.from(requiredLicenses).filter(license => !context.licenses.includes(license));
  if (missingLicenses.length > 0) {
    reasons.push(`Missing license(s): ${missingLicenses.join(', ')}`);
  }
  diff.push(...diffForLicenses(rule, context, missingLicenses));

  const requiredWarrants = new Set(rule.requires.warrants ?? []);
  const missingWarrants = Array.from(requiredWarrants).filter(warrant => !context.warrants.includes(warrant));
  if (missingWarrants.length > 0) {
    reasons.push(`Missing warrant(s): ${missingWarrants.join(', ')}`);
  }
  diff.push(...diffForWarrants(rule, missingWarrants));

  const allowedJurisdictions = rule.requires.jurisdictions && rule.requires.jurisdictions.length > 0
    ? new Set(rule.requires.jurisdictions)
    : new Set(program.jurisdiction.allowed);
  const jurisdictionAllowed = context.jurisdiction ? allowedJurisdictions.has(context.jurisdiction) : false;
  if (!jurisdictionAllowed) {
    reasons.push(
      context.jurisdiction
        ? `Jurisdiction ${context.jurisdiction} not permitted`
        : 'Jurisdiction not provided',
    );
  }
  diff.push(...diffForJurisdiction(rule, program, context.jurisdiction, jurisdictionAllowed));

  const retentionLimit = rule.requires.retention?.maxDays ?? program.retention.defaultMaxDays;
  const retentionCompliant = context.retentionDays != null && context.retentionDays <= retentionLimit;
  if (!retentionCompliant) {
    reasons.push(
      context.retentionDays == null
        ? 'Retention duration missing'
        : `Requested retention ${context.retentionDays} exceeds limit ${retentionLimit}`,
    );
  }
  diff.push(...diffForRetention(rule, program, context.retentionDays, retentionCompliant));

  return { reasons, diff };
}

export function simulate(program: PolicyProgram, context: SimulationContext): SimulationResult {
  const rule = findRule(program, context);
  if (!rule) {
    return {
      status: 'allow',
      legalBasis: 'NO_RULE_MATCH',
      ruleId: undefined,
      reasons: [],
      diff: [
        {
          element: 'rule',
          change: 'Add specific rule for this operation',
          impact: 'ALLOW ➜ (depends on new rule)',
          details: 'No rule matched; default allow path used.',
        },
      ],
      annotations: {
        legalBasis: 'No matching rule — default allow',
      },
    };
  }

  const { reasons, diff } = evaluateRule(rule, program, context);
  const status = reasons.length === 0 ? 'allow' : 'block';
  const annotations: Record<string, string> = {
    legalBasis: rule.legalBasis,
    ruleId: rule.id,
  };
  if (status === 'allow') {
    annotations['lac.simulation'] = 'All requirements satisfied';
  } else {
    annotations['lac.simulation'] = 'Policy violation';
  }
  return {
    status,
    legalBasis: rule.legalBasis,
    ruleId: rule.id,
    reasons,
    diff,
    appealHint: rule.appealHint,
    annotations,
  };
}
