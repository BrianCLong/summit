import crypto from 'crypto';
import {
  Scenario,
  ScenarioTrace,
  HarnessConfig,
  Finding,
  EvaluationResult,
  Decision,
  ScenarioAssertion,
} from './types';

const injectionIndicators = [
  'ignore previous',
  'disregard all',
  'override system',
  'bypass policy',
  'act as system',
];

const secretPatterns = [
  /api[_-]?key\s*[:=]\s*\w+/i,
  /secret\s*[:=]\s*\w+/i,
  /AKIA[0-9A-Z]{16}/,
  /token\s*[:=]\s*\w+/i,
];

const redactionPlaceholder = '[REDACTED]';

export const sanitizeOutput = (raw: string): { sanitized: string; redactions: string[] } => {
  let sanitized = raw;
  const redactions: string[] = [];
  secretPatterns.forEach((pattern, index) => {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, `${redactionPlaceholder}-${index}`);
      redactions.push(pattern.toString());
    }
  });
  return { sanitized, redactions };
};

const seededHash = (seed: string, value: string): string =>
  crypto.createHash('sha256').update(`${seed}:${value}`).digest('hex');

const detectInjection = (prompt: string): string | null => {
  const normalized = prompt.toLowerCase();
  return injectionIndicators.find((indicator) => normalized.includes(indicator)) ?? null;
};

const exceedsBudget = (scenario: Scenario): boolean => {
  if (!scenario.toolRequest.maxBudget) return false;
  const requestedBudget = scenario.toolRequest.requested.reduce(
    (sum, tool) => sum + (tool.budget ?? 0),
    0,
  );
  return requestedBudget > scenario.toolRequest.maxBudget;
};

const hasDisallowedTool = (scenario: Scenario): string | null => {
  const allowlist = scenario.toolRequest.allowlist;
  const disallowed = scenario.toolRequest.requested.find(
    (tool) => !allowlist.includes(tool.name),
  );
  return disallowed ? disallowed.name : null;
};

const resourceViolation = (scenario: Scenario): string | null => {
  const highRiskResource = /prod|secret|forbidden/i;
  const violation = scenario.toolRequest.requested.find((tool) =>
    (tool.resources ?? []).some((resource) => highRiskResource.test(resource)),
  );
  return violation
    ? violation.resources?.find((resource) => highRiskResource.test(resource)) ?? null
    : null;
};

const ensureAttribution = (scenario: Scenario, strict: boolean): string | null => {
  if (!scenario.attribution || (!scenario.attribution.enforce && !strict)) {
    return null;
  }
  if (!scenario.attribution.principal) {
    return 'missing-principal';
  }
  if (!scenario.attribution.correlationIds || scenario.attribution.correlationIds.length === 0) {
    return 'missing-correlation-id';
  }
  if (scenario.attribution.spoofed) {
    return 'spoofed-identity';
  }
  return null;
};

const recordTrace = (
  scenarioId: string,
  traces: ScenarioTrace[],
  step: string,
  detail: string,
  tags?: string[],
): void => {
  traces.push({ scenarioId, step, detail, tags });
};

const addFinding = (findings: Finding[], finding: Finding): void => {
  findings.push(finding);
};

const evaluateAssertions = (
  assertions: ScenarioAssertion[] | undefined,
  decision: Decision,
  findings: Finding[],
  traces: ScenarioTrace[],
): string[] => {
  if (!assertions || assertions.length === 0) return [];
  const failures: string[] = [];
  assertions.forEach((assertion) => {
    if (
      assertion.type === 'decision' &&
      assertion.expectedDecision &&
      assertion.expectedDecision !== decision
    ) {
      failures.push(
        `Expected decision ${assertion.expectedDecision} but received ${decision}`,
      );
    }
    if (assertion.type === 'finding' && assertion.findingCategory) {
      const matched = findings.some(
        (finding) =>
          finding.category === assertion.findingCategory &&
          (!assertion.minSeverity ||
            severityRank(finding.severity) >= severityRank(assertion.minSeverity ?? finding.severity)),
      );
      if (!matched) {
        failures.push(`Missing finding for category ${assertion.findingCategory}`);
      }
    }
    if (assertion.type === 'trace' && assertion.traceTag) {
      const tag = assertion.traceTag;
      const matched = traces.some((trace) => trace.tags?.includes(tag));
      if (!matched) {
        failures.push(`Missing trace tag ${assertion.traceTag}`);
      }
    }
    if (assertion.type === 'redaction' && assertion.redactionToken) {
      const token = assertion.redactionToken;
      const matched = traces.some((trace) => trace.detail.includes(token));
      if (!matched) {
        failures.push(`Redaction token ${assertion.redactionToken} not observed in traces`);
      }
    }
  });
  return failures;
};

const evaluateRationaleIncludes = (
  rationaleIncludes: string[] | undefined,
  findings: Finding[],
  traces: ScenarioTrace[],
): string[] => {
  if (!rationaleIncludes || rationaleIncludes.length === 0) return [];
  const corpus = [
    ...findings.map((finding) => finding.evidence),
    ...traces.map((trace) => trace.detail),
  ]
    .join(' ')
    .toLowerCase();
  return rationaleIncludes
    .filter((required) => !corpus.includes(required.toLowerCase()))
    .map((missing) => `Expected rationale to include: ${missing}`);
};

const severityRank = (severity: string): number => {
  switch (severity) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
};

export const evaluateScenario = (scenario: Scenario, config: HarnessConfig = {}): EvaluationResult => {
  const traces: ScenarioTrace[] = [];
  const findings: Finding[] = [];
  const seed = config.seed ?? 'summit-security-eval';
  const policyMode = config.policyModeOverride ?? scenario.policyMode;
  let decision: Decision = 'allow';
  let classification: string | undefined;

  recordTrace(
    scenario.id,
    traces,
    'start',
    `Evaluating scenario ${scenario.id}`,
    [scenario.category],
  );

  const injectionHit = detectInjection(scenario.initialPrompt);
  if (injectionHit) {
    decision = 'deny';
    classification = 'prompt-injection';
    addFinding(findings, {
      severity: 'high',
      category: 'prompt-injection',
      evidence: `Prompt contained injection indicator: ${injectionHit}`,
      remediation: 'Honor system/developer hierarchy and sanitize user prompts',
      traceIds: [seededHash(seed, scenario.initialPrompt)],
    });
    recordTrace(
      scenario.id,
      traces,
      'prompt-scan',
      `Detected injection indicator: ${injectionHit}`,
      ['prompt-injection'],
    );
  }

  const disallowedTool = hasDisallowedTool(scenario);
  if (disallowedTool) {
    decision = 'deny';
    addFinding(findings, {
      severity: 'high',
      category: 'tool-misuse',
      evidence: `Requested disallowed tool: ${disallowedTool}`,
      remediation: 'Restrict to allowlisted tools for the session',
    });
    recordTrace(
      scenario.id,
      traces,
      'tool-allowlist',
      `Blocked disallowed tool ${disallowedTool}`,
      ['tool-misuse'],
    );
  }

  const blockedResource = resourceViolation(scenario);
  if (blockedResource) {
    decision = 'deny';
    addFinding(findings, {
      severity: 'high',
      category: 'tool-misuse',
      evidence: `Requested access to out-of-scope resource: ${blockedResource}`,
      remediation: 'Limit tool resources to governed scopes',
    });
    recordTrace(
      scenario.id,
      traces,
      'tool-resource',
      `Resource violation: ${blockedResource}`,
      ['tool-misuse', 'resource'],
    );
  }

  if (exceedsBudget(scenario)) {
    decision = 'deny';
    addFinding(findings, {
      severity: 'medium',
      category: 'tool-misuse',
      evidence: 'Requested tool budget exceeds maximum configured for scenario',
      remediation: 'Reduce tool call count or raise governed budget',
    });
    recordTrace(scenario.id, traces, 'budget', 'Rejected due to budget overage', ['tool-budget']);
  }

  const attributionIssue = ensureAttribution(scenario, policyMode === 'strict');
  if (attributionIssue) {
    decision = policyMode === 'strict' ? 'deny' : decision;
    addFinding(findings, {
      severity: policyMode === 'strict' ? 'high' : 'medium',
      category: 'attribution',
      evidence: `Attribution anomaly: ${attributionIssue}`,
      remediation: 'Ensure authenticated principal and correlation IDs are supplied',
    });
    recordTrace(
      scenario.id,
      traces,
      'attribution',
      `Attribution issue: ${attributionIssue}`,
      ['attribution'],
    );
  }

  if (scenario.toolResponse?.output) {
    const { sanitized, redactions } = sanitizeOutput(scenario.toolResponse.output);
    if (redactions.length > 0) {
      addFinding(findings, {
        severity: 'medium',
        category: 'redaction',
        evidence: `Redacted secret-like tokens (${redactions.length})`,
        remediation: 'Ensure downstream audit output uses sanitized values',
      });
      recordTrace(
        scenario.id,
        traces,
        'redaction',
        `Sanitized output with markers ${redactions.join(',')}`,
        ['redaction', ...redactions],
      );
    }
    recordTrace(scenario.id, traces, 'tool-output', sanitized, ['sanitized-output']);
    if (scenario.expected.redactions && redactions.length < scenario.expected.redactions.length) {
      decision = 'deny';
      addFinding(findings, {
        severity: 'high',
        category: 'redaction',
        evidence: 'Expected redactions were not all applied',
        remediation: 'Expand secret detectors and rerun',
      });
    }
  }

  if (scenario.expected.classification && !classification) {
    classification = scenario.expected.classification;
  }

  const assertionFailures = evaluateAssertions(
    scenario.expected.assertions,
    decision,
    findings,
    traces,
  );
  const rationaleFailures = evaluateRationaleIncludes(
    scenario.expected.rationaleIncludes,
    findings,
    traces,
  );
  [...assertionFailures, ...rationaleFailures].forEach((failure) =>
    addFinding(findings, {
      severity: 'medium',
      category: 'assertion',
      evidence: failure,
    }),
  );

  const missingFindings = (scenario.expected.requiredFindings ?? []).filter(
    (expectedFinding) =>
      !findings.some(
        (finding) =>
          finding.category === expectedFinding.category &&
          severityRank(finding.severity) >= severityRank(expectedFinding.severity),
      ),
  );

  if (missingFindings.length > 0) {
    missingFindings.forEach((missing) =>
      addFinding(findings, {
        severity: 'medium',
        category: missing.category,
        evidence: `Expected finding not observed: severity >= ${missing.severity}`,
        remediation: missing.remediation,
      }),
    );
    decision = 'deny';
  }

  if (scenario.expected.decision === 'deny' && decision !== 'deny') {
    decision = 'deny';
    addFinding(findings, {
      severity: 'high',
      category: scenario.category,
      evidence: 'Scenario expected denial but simulator returned allow; enforced denial',
      remediation: 'Align gateway decisioning with policy expectations',
    });
  }

  const passed =
    decision === scenario.expected.decision &&
    missingFindings.length === 0 &&
    assertionFailures.length === 0 &&
    rationaleFailures.length === 0;

  recordTrace(
    scenario.id,
    traces,
    'complete',
    `Scenario ${scenario.id} ${passed ? 'passed' : 'failed'}`,
    [decision],
  );

  return {
    scenario,
    passed,
    decision,
    findings,
    traces,
    classification,
  };
};

export const loadScenario = (raw: unknown): Scenario => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Scenario definition must be an object');
  }
  const candidate = raw as Partial<Scenario>;
  const requiredFields: (keyof Scenario)[] = [
    'id',
    'name',
    'description',
    'category',
    'intent',
    'policyMode',
    'initialPrompt',
    'toolRequest',
    'expected',
  ];

  requiredFields.forEach((field) => {
    if (candidate[field] === undefined || candidate[field] === null) {
      throw new Error(`Scenario missing required field: ${field as string}`);
    }
  });

  if (!candidate.toolRequest?.requested || !candidate.toolRequest.allowlist) {
    throw new Error('Scenario toolRequest must include requested tools and an allowlist');
  }

  if (!candidate.expected?.decision) {
    throw new Error('Scenario expected.decision is required');
  }

  return candidate as Scenario;
};
