import crypto from 'node:crypto';

export type ClauseChangeType = 'added' | 'removed' | 'modified';

export interface LegalDocument {
  name: string;
  version: string;
  text: string;
}

export interface Clause {
  id: string;
  heading: string;
  body: string;
}

export interface ClauseDiff {
  clauseId: string;
  changeType: ClauseChangeType;
  beforeClause?: Clause;
  afterClause?: Clause;
}

export type PolicyDeltaStatus = 'allowed' | 'blocked' | 'manual-review';

export interface PolicyDeltaTemplate {
  policyId: string;
  action: 'add' | 'update' | 'remove';
  summary: string;
  status: PolicyDeltaStatus;
  beforeState?: string | null;
  afterState?: string | null;
}

export interface SloImpactEntry {
  metric: string;
  delta: number;
  unit: string;
  reason: string;
}

export interface RuleMatchContext {
  diff: ClauseDiff;
  text: string;
}

export interface RuleDefinition {
  id: string;
  description: string;
  clauseIds?: string[];
  changeTypes?: ClauseChangeType[];
  keywords?: string[];
  delta: PolicyDeltaTemplate;
  obligations?: string[];
  sloImpact?: SloImpactEntry[];
  projector?: (context: RuleMatchContext) => Partial<PolicyDeltaTemplate>;
}

export interface RuleCatalog {
  rules: RuleDefinition[];
}

export interface PolicyDelta extends PolicyDeltaTemplate {
  ruleId: string;
  clauseId: string;
  changeType: ClauseChangeType;
  clauseHeading?: string;
  clauseExcerpt?: string;
  obligations: string[];
  sloImpact: SloImpactEntry[];
}

export interface AggregatedSloImpact {
  metric: string;
  totalDelta: number;
  unit: string;
  direction: 'improved' | 'degraded' | 'neutral';
  drivers: string[];
}

export interface ImpactSummary {
  blockedChanges: number;
  allowedChanges: number;
  manualReviewChanges: number;
  obligations: string[];
  sloImpact: AggregatedSloImpact[];
}

export interface ImpactReportPayload {
  generatedAt: string;
  baseline: { name: string; version: string };
  revised: { name: string; version: string };
  clauseDiffs: Array<{
    clauseId: string;
    changeType: ClauseChangeType;
    beforeHeading?: string;
    afterHeading?: string;
    beforeText?: string;
    afterText?: string;
  }>;
  policyDeltas: Array<{
    policyId: string;
    ruleId: string;
    clauseId: string;
    summary: string;
    status: PolicyDeltaStatus;
    action: PolicyDeltaTemplate['action'];
    beforeState?: string | null;
    afterState?: string | null;
  }>;
  impactSummary: ImpactSummary;
}

export interface SignedImpactReport {
  payload: ImpactReportPayload;
  signature: string;
  algorithm: 'ed25519';
  publicKey: string;
  canonicalPayload: string;
}

export interface PolicyDiffView {
  policyId: string;
  ruleId: string;
  clauseId: string;
  status: PolicyDeltaStatus;
  action: PolicyDeltaTemplate['action'];
  summary: string;
  beforeState?: string | null;
  afterState?: string | null;
}

export interface PolicyPullRequest {
  title: string;
  body: string;
  diffs: PolicyDiffView[];
}

export interface RunOptions {
  baselineDoc: LegalDocument;
  revisedDoc: LegalDocument;
  catalog?: RuleCatalog;
  timestamp?: string;
  privateKeyPem?: string;
  publicKeyPem?: string;
}

export interface RunResult {
  clauseDiffs: ClauseDiff[];
  policyDeltas: PolicyDelta[];
  impactSummary: ImpactSummary;
  signedReport: SignedImpactReport;
  pullRequest: PolicyPullRequest;
  reportText: string;
}

const DEFAULT_PRIVATE_KEY = process.env.LTDIM_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'; // TODO: Load from a secure location

const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtfR/sCXeHwMoUxAIKvs5ZS9NzDteLpUrG3LJpg973fM=\n-----END PUBLIC KEY-----`;

const CLAUSE_HEADER_REGEX = /^(Clause|Section|Article)\s+([0-9A-Za-z.\-]+)\s*[:\-]?\s*(.*)$/i;

export const DEFAULT_RULE_CATALOG: RuleCatalog = {
  rules: [
    {
      id: 'cross-border-eu-only',
      description:
        'Restrict cross-border transfers to EU sovereign regions when clause prohibits extra-EU processing.',
      clauseIds: ['Clause 3'],
      changeTypes: ['modified', 'added'],
      keywords: ['cross-border', 'prohibited', 'eu'],
      delta: {
        policyId: 'geo.transfer.restrictions',
        action: 'update',
        status: 'blocked',
        summary: 'Enforce EU-only residency for personal data transfers.',
        beforeState: 'geoPolicy.allowNonEuTransfers = true',
        afterState: 'geoPolicy.allowNonEuTransfers = false'
      },
      obligations: ['Route data flows to EU sovereign storage providers'],
      sloImpact: [
        {
          metric: 'dataResidencyCutover',
          delta: 4,
          unit: 'hours',
          reason: 'Migration to EU sovereign regions'
        },
        {
          metric: 'transferLatency',
          delta: 12,
          unit: '%',
          reason: 'Geo-fencing and compliance routing'
        }
      ]
    },
    {
      id: 'retention-window-extension',
      description: 'Extend data retention windows when clause increases storage duration.',
      clauseIds: ['Clause 4'],
      changeTypes: ['modified'],
      keywords: ['retain', '90'],
      delta: {
        policyId: 'data.retention.window',
        action: 'update',
        status: 'allowed',
        summary: 'Extend retention timer to updated clause requirement.'
      },
      obligations: [
        'Update retention timer configuration to 90 days',
        'Notify compliance team of retention change'
      ],
      sloImpact: [
        {
          metric: 'storageCost',
          delta: 15,
          unit: '%',
          reason: 'Longer retention window'
        }
      ],
      projector: ({ diff, text }) => {
        const afterDays = extractDays(text);
        const beforeDays = extractDays(diff.beforeClause?.body ?? '');
        const updates: Partial<PolicyDeltaTemplate> = {};
        if (afterDays !== undefined) {
          updates.summary = `Extend retention window to ${afterDays} days.`;
          updates.afterState = `retention.days = ${afterDays}`;
        }
        if (beforeDays !== undefined) {
          updates.beforeState = `retention.days = ${beforeDays}`;
        }
        return updates;
      }
    },
    {
      id: 'incident-accelerated-notification',
      description: 'Tighten breach notification SLA based on clause updates.',
      clauseIds: ['Clause 5'],
      changeTypes: ['modified'],
      keywords: ['24', 'hour'],
      delta: {
        policyId: 'incident.response.notification',
        action: 'update',
        status: 'allowed',
        summary: 'Accelerate breach notification SLA to 24 hours.',
        beforeState: 'incident.slaHours = 72',
        afterState: 'incident.slaHours = 24'
      },
      obligations: ['Implement automated detection to support 24h breach notifications'],
      sloImpact: [
        {
          metric: 'onCallLoad',
          delta: 2,
          unit: 'FTE',
          reason: 'Need expanded on-call coverage for faster notification'
        }
      ]
    },
    {
      id: 'ai-transparency-governance',
      description: 'Add AI transparency obligations when new audit clauses are introduced.',
      clauseIds: ['Clause 6'],
      changeTypes: ['added'],
      keywords: ['ai', 'transparency', 'audit'],
      delta: {
        policyId: 'ai.governance.transparency',
        action: 'add',
        status: 'allowed',
        summary: 'Enable AI transparency controls and audit logging.'
      },
      obligations: [
        'Stand up AI transparency reporting pipeline',
        'Schedule quarterly model governance audits'
      ],
      sloImpact: [
        {
          metric: 'auditCycleTime',
          delta: -10,
          unit: '%',
          reason: 'Automated evidence collection via transparency tooling'
        }
      ]
    }
  ]
};

export function parseLegalText(text: string): Clause[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const clauses: Clause[] = [];
  let current: { id: string; heading: string; bodyLines: string[] } | null = null;

  const pushCurrent = () => {
    if (!current) {
      return;
    }
    const body = current.bodyLines.join('\n').trim();
    clauses.push({ id: current.id, heading: current.heading, body });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line && !current) {
      continue;
    }
    const match = line.match(CLAUSE_HEADER_REGEX);
    if (match) {
      pushCurrent();
      const [, keyword, identifier, trailing] = match;
      const normalizedKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
      const id = `${normalizedKeyword} ${identifier}`;
      const heading = trailing.trim();
      current = { id, heading, bodyLines: [] };
      continue;
    }
    if (current) {
      current.bodyLines.push(rawLine.trimEnd());
    }
  }

  pushCurrent();
  return clauses;
}

function clauseFingerprint(clause: Clause): string {
  return `${clause.heading}\n${clause.body}`.trim();
}

export function diffClauses(baseline: Clause[], revised: Clause[]): ClauseDiff[] {
  const baselineMap = new Map(baseline.map((clause) => [clause.id, clause]));
  const revisedMap = new Map(revised.map((clause) => [clause.id, clause]));
  const ids = new Set<string>();
  baseline.forEach((c) => ids.add(c.id));
  revised.forEach((c) => ids.add(c.id));
  const sortedIds = Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const diffs: ClauseDiff[] = [];
  for (const clauseId of sortedIds) {
    const beforeClause = baselineMap.get(clauseId);
    const afterClause = revisedMap.get(clauseId);
    if (!beforeClause && afterClause) {
      diffs.push({ clauseId, changeType: 'added', afterClause });
      continue;
    }
    if (beforeClause && !afterClause) {
      diffs.push({ clauseId, changeType: 'removed', beforeClause });
      continue;
    }
    if (beforeClause && afterClause) {
      if (clauseFingerprint(beforeClause) !== clauseFingerprint(afterClause)) {
        diffs.push({ clauseId, changeType: 'modified', beforeClause, afterClause });
      }
    }
  }

  return diffs;
}

function matchesRule(rule: RuleDefinition, diff: ClauseDiff, text: string): boolean {
  if (rule.clauseIds && !rule.clauseIds.includes(diff.clauseId)) {
    return false;
  }
  if (rule.changeTypes && !rule.changeTypes.includes(diff.changeType)) {
    return false;
  }
  if (rule.keywords && rule.keywords.length > 0) {
    const normalizedText = text.toLowerCase();
    for (const keyword of rule.keywords) {
      if (!normalizedText.includes(keyword.toLowerCase())) {
        return false;
      }
    }
  }
  return true;
}

function buildPolicyDelta(rule: RuleDefinition, diff: ClauseDiff, text: string): PolicyDelta {
  const template: PolicyDeltaTemplate = {
    ...rule.delta,
    beforeState: rule.delta.beforeState ?? null,
    afterState: rule.delta.afterState ?? null
  };

  const projection = rule.projector?.({ diff, text });
  if (projection) {
    if (projection.summary) {
      template.summary = projection.summary;
    }
    if (Object.prototype.hasOwnProperty.call(projection, 'beforeState')) {
      template.beforeState = projection.beforeState ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(projection, 'afterState')) {
      template.afterState = projection.afterState ?? null;
    }
  }

  return {
    ...template,
    ruleId: rule.id,
    clauseId: diff.clauseId,
    changeType: diff.changeType,
    clauseHeading: diff.afterClause?.heading ?? diff.beforeClause?.heading,
    clauseExcerpt: text.trim(),
    obligations: [...(rule.obligations ?? [])],
    sloImpact: [...(rule.sloImpact ?? [])]
  };
}

export function mapDiffsToPolicyDeltas(diffs: ClauseDiff[], catalog: RuleCatalog): PolicyDelta[] {
  const policyDeltas: PolicyDelta[] = [];
  for (const diff of diffs) {
    const referenceClause = diff.afterClause ?? diff.beforeClause;
    if (!referenceClause) {
      continue;
    }
    const searchableText = `${referenceClause.heading}\n${referenceClause.body}`;
    for (const rule of catalog.rules) {
      if (matchesRule(rule, diff, searchableText)) {
        const delta = buildPolicyDelta(rule, diff, searchableText);
        policyDeltas.push(delta);
      }
    }
  }

  policyDeltas.sort((a, b) => {
    if (a.policyId === b.policyId) {
      return a.ruleId.localeCompare(b.ruleId);
    }
    return a.policyId.localeCompare(b.policyId);
  });
  return policyDeltas;
}

export function simulateImpact(policyDeltas: PolicyDelta[]): ImpactSummary {
  let blockedChanges = 0;
  let allowedChanges = 0;
  let manualReviewChanges = 0;
  const obligations = new Set<string>();
  const sloMap = new Map<string, { metric: string; totalDelta: number; unit: string; drivers: Set<string> }>();

  for (const delta of policyDeltas) {
    if (delta.status === 'blocked') {
      blockedChanges += 1;
    } else if (delta.status === 'allowed') {
      allowedChanges += 1;
    } else {
      manualReviewChanges += 1;
    }

    for (const obligation of delta.obligations) {
      obligations.add(obligation);
    }

    for (const impact of delta.sloImpact) {
      const key = `${impact.metric}::${impact.unit}`;
      const entry = sloMap.get(key);
      if (!entry) {
        sloMap.set(key, {
          metric: impact.metric,
          totalDelta: impact.delta,
          unit: impact.unit,
          drivers: new Set([impact.reason])
        });
      } else {
        entry.totalDelta += impact.delta;
        entry.drivers.add(impact.reason);
      }
    }
  }

  const sloImpact: AggregatedSloImpact[] = Array.from(sloMap.values()).map((entry) => {
    let direction: AggregatedSloImpact['direction'] = 'neutral';
    if (entry.totalDelta > 0) {
      direction = 'degraded';
    } else if (entry.totalDelta < 0) {
      direction = 'improved';
    }
    return {
      metric: entry.metric,
      totalDelta: Number(entry.totalDelta.toFixed(4)),
      unit: entry.unit,
      direction,
      drivers: Array.from(entry.drivers).sort((a, b) => a.localeCompare(b))
    };
  });

  sloImpact.sort((a, b) => a.metric.localeCompare(b.metric));

  return {
    blockedChanges,
    allowedChanges,
    manualReviewChanges,
    obligations: Array.from(obligations).sort((a, b) => a.localeCompare(b)),
    sloImpact
  };
}

function canonicalizeReportPayload(payload: ImpactReportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function signImpactReport(
  payload: ImpactReportPayload,
  privateKeyPem: string = DEFAULT_PRIVATE_KEY
): SignedImpactReport {
  const canonicalPayload = canonicalizeReportPayload(payload);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload), privateKey).toString('base64');
  return {
    payload,
    signature,
    algorithm: 'ed25519',
    publicKey: DEFAULT_PUBLIC_KEY,
    canonicalPayload
  };
}

export function verifyImpactReportSignature(
  canonicalPayload: string,
  signature: string,
  publicKeyPem: string = DEFAULT_PUBLIC_KEY
): boolean {
  const publicKey = crypto.createPublicKey(publicKeyPem);
  return crypto.verify(null, Buffer.from(canonicalPayload), publicKey, Buffer.from(signature, 'base64'));
}

export function renderImpactReport(report: SignedImpactReport): string {
  const lines: string[] = [];
  lines.push(`# LTDIM Impact Report`);
  lines.push(`Generated: ${report.payload.generatedAt}`);
  lines.push(`Baseline: ${report.payload.baseline.name} (${report.payload.baseline.version})`);
  lines.push(`Revised: ${report.payload.revised.name} (${report.payload.revised.version})`);
  lines.push('');
  lines.push('## Clause Changes');
  if (report.payload.clauseDiffs.length === 0) {
    lines.push('- No clause changes detected.');
  } else {
    for (const clause of report.payload.clauseDiffs) {
      lines.push(
        `- ${clause.clauseId} (${clause.changeType}) — ${
          clause.afterHeading ?? clause.beforeHeading ?? 'Unspecified heading'
        }`
      );
    }
  }
  lines.push('');
  lines.push('## Policy Deltas');
  if (report.payload.policyDeltas.length === 0) {
    lines.push('- No policy updates required.');
  } else {
    for (const delta of report.payload.policyDeltas) {
      lines.push(
        `- [${delta.status.toUpperCase()}] ${delta.policyId} (${delta.action}) ← rule ${delta.ruleId} (${delta.clauseId})`
      );
      if (delta.beforeState) {
        lines.push(`  • Before: ${delta.beforeState}`);
      }
      if (delta.afterState) {
        lines.push(`  • After: ${delta.afterState}`);
      }
      lines.push(`  • Summary: ${delta.summary}`);
    }
  }
  lines.push('');
  lines.push('## Impact Summary');
  lines.push(
    `- Changes — blocked: ${report.payload.impactSummary.blockedChanges}, allowed: ${report.payload.impactSummary.allowedChanges}, manual-review: ${report.payload.impactSummary.manualReviewChanges}`
  );
  lines.push('- Obligations:');
  if (report.payload.impactSummary.obligations.length === 0) {
    lines.push('  • None');
  } else {
    for (const obligation of report.payload.impactSummary.obligations) {
      lines.push(`  • ${obligation}`);
    }
  }
  lines.push('- SLO Effects:');
  if (report.payload.impactSummary.sloImpact.length === 0) {
    lines.push('  • None');
  } else {
    for (const slo of report.payload.impactSummary.sloImpact) {
      lines.push(
        `  • ${slo.metric}: ${slo.totalDelta}${slo.unit} (${slo.direction}); drivers: ${slo.drivers.join(
          '; '
        )}`
      );
    }
  }
  lines.push('');
  lines.push('## Signature');
  lines.push(`- Algorithm: ${report.algorithm}`);
  lines.push(`- Signature: ${report.signature}`);
  lines.push(`- Public key: ${report.publicKey}`);
  return lines.join('\n');
}

export function buildPolicyPullRequest(
  baselineDoc: LegalDocument,
  revisedDoc: LegalDocument,
  policyDeltas: PolicyDelta[],
  impactSummary: ImpactSummary
): PolicyPullRequest {
  const title = `LTDIM: ${baselineDoc.name} ${baselineDoc.version} → ${revisedDoc.version}`;
  const headerLines: string[] = [];
  headerLines.push('## Summary');
  headerLines.push(
    `- Blocked changes: ${impactSummary.blockedChanges}; allowed changes: ${impactSummary.allowedChanges}; manual review: ${impactSummary.manualReviewChanges}`
  );
  if (impactSummary.obligations.length > 0) {
    headerLines.push('- Obligations:');
    for (const obligation of impactSummary.obligations) {
      headerLines.push(`  - ${obligation}`);
    }
  } else {
    headerLines.push('- Obligations: none');
  }
  if (impactSummary.sloImpact.length > 0) {
    headerLines.push('- SLO effects:');
    for (const slo of impactSummary.sloImpact) {
      headerLines.push(
        `  - ${slo.metric}: ${slo.totalDelta}${slo.unit} (${slo.direction}); drivers: ${slo.drivers.join(', ')}`
      );
    }
  } else {
    headerLines.push('- SLO effects: none');
  }
  headerLines.push('');
  headerLines.push('## Policy Changes');
  if (policyDeltas.length === 0) {
    headerLines.push('- No policy updates required.');
  } else {
    for (const delta of policyDeltas) {
      headerLines.push(
        `- ${delta.policyId} (${delta.action}, ${delta.status}) — ${delta.summary} [rule ${delta.ruleId}]`
      );
      if (delta.beforeState) {
        headerLines.push(`  - Before: ${delta.beforeState}`);
      }
      if (delta.afterState) {
        headerLines.push(`  - After: ${delta.afterState}`);
      }
    }
  }

  const diffs: PolicyDiffView[] = policyDeltas.map((delta) => ({
    policyId: delta.policyId,
    ruleId: delta.ruleId,
    clauseId: delta.clauseId,
    status: delta.status,
    action: delta.action,
    summary: delta.summary,
    beforeState: delta.beforeState ?? null,
    afterState: delta.afterState ?? null
  }));

  return {
    title,
    body: headerLines.join('\n'),
    diffs
  };
}

export function runLtdim(options: RunOptions): RunResult {
  const catalog = options.catalog ?? DEFAULT_RULE_CATALOG;
  const timestamp = options.timestamp ?? new Date().toISOString();
  const privateKeyPem = options.privateKeyPem ?? DEFAULT_PRIVATE_KEY;
  const publicKeyPem = options.publicKeyPem ?? DEFAULT_PUBLIC_KEY;

  const baselineClauses = parseLegalText(options.baselineDoc.text);
  const revisedClauses = parseLegalText(options.revisedDoc.text);
  const clauseDiffs = diffClauses(baselineClauses, revisedClauses);
  const policyDeltas = mapDiffsToPolicyDeltas(clauseDiffs, catalog);
  const impactSummary = simulateImpact(policyDeltas);

  const reportPayload: ImpactReportPayload = {
    generatedAt: timestamp,
    baseline: {
      name: options.baselineDoc.name,
      version: options.baselineDoc.version
    },
    revised: {
      name: options.revisedDoc.name,
      version: options.revisedDoc.version
    },
    clauseDiffs: clauseDiffs.map((diff) => ({
      clauseId: diff.clauseId,
      changeType: diff.changeType,
      beforeHeading: diff.beforeClause?.heading,
      afterHeading: diff.afterClause?.heading,
      beforeText: diff.beforeClause ? clauseFingerprint(diff.beforeClause) : undefined,
      afterText: diff.afterClause ? clauseFingerprint(diff.afterClause) : undefined
    })),
    policyDeltas: policyDeltas.map((delta) => ({
      policyId: delta.policyId,
      ruleId: delta.ruleId,
      clauseId: delta.clauseId,
      summary: delta.summary,
      status: delta.status,
      action: delta.action,
      beforeState: delta.beforeState ?? null,
      afterState: delta.afterState ?? null
    })),
    impactSummary
  };

  const signedReport = signImpactReport(reportPayload, privateKeyPem);
  signedReport.publicKey = publicKeyPem;
  const reportText = renderImpactReport(signedReport);
  const pullRequest = buildPolicyPullRequest(options.baselineDoc, options.revisedDoc, policyDeltas, impactSummary);

  return {
    clauseDiffs,
    policyDeltas,
    impactSummary,
    signedReport,
    pullRequest,
    reportText
  };
}

function extractDays(text: string): number | undefined {
  const match = text.match(/(\d{1,4})\s*day/i);
  if (!match) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}
