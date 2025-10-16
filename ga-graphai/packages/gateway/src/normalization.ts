import {
  ClarifyingQuestion,
  EvidenceLink,
  NormalizedTask,
  PolicyMetadata,
  TaskConstraints,
  TaskInputReference,
  TaskSpec,
  Ticket,
  TicketInput,
  validateTaskSpec,
} from '@ga-graphai/common-types';

import { AcceptanceCriteriaSynthesizer } from './acceptanceCriteria.js';
import { PolicyTagger } from './policyTagger.js';
import {
  dedupeParagraphs,
  detectLanguage,
  extractBudgetUSD,
  extractContextLimit,
  extractEntities,
  extractKeyValues,
  extractLatency,
  findAmbiguousPhrases,
  normalizeWhitespace,
  splitParagraphs,
} from './utils.js';

export interface NormalizationOptions {
  defaultPolicy: PolicyMetadata;
  defaultConstraints: TaskConstraints;
  clarifyingQuestionLimit?: number;
}

const DEFAULT_SLA_DAYS = 7;

export class TicketNormalizer {
  private readonly synthesizer = new AcceptanceCriteriaSynthesizer();
  private readonly tagger: PolicyTagger;
  private readonly clarifyingQuestionLimit: number;

  constructor(private readonly options: NormalizationOptions) {
    this.tagger = new PolicyTagger(options.defaultPolicy);
    this.clarifyingQuestionLimit = options.clarifyingQuestionLimit ?? 3;
  }

  normalize(input: TicketInput): NormalizedTask {
    const deduped = dedupeParagraphs(input.body);
    const language = detectLanguage(deduped);
    const keyValues = extractKeyValues(deduped);

    const goal = keyValues['goal'] ?? this.deriveGoal(deduped, input.title);
    const nonGoals = this.deriveNonGoals(deduped);
    const constraints = this.deriveConstraints(deduped, keyValues);
    const inputs = this.deriveInputs(deduped, keyValues);
    const evidence = this.deriveEvidence(deduped);
    const risks = this.deriveRisks(deduped);
    const raci = this.deriveRaci(keyValues);
    const sla = this.deriveSla(keyValues);

    const { policy, tags } = this.tagger.tag(deduped, {
      retention:
        (keyValues['retention'] as PolicyMetadata['retention']) ??
        this.options.defaultPolicy.retention,
      purpose:
        (keyValues['purpose'] as PolicyMetadata['purpose']) ??
        this.options.defaultPolicy.purpose,
      pii: /pii|personal data/i.test(deduped) || this.options.defaultPolicy.pii,
    });

    const { criteria, missingSignals } = this.synthesizer.generate(deduped, [
      keyValues['acceptance'] ?? '',
    ]);

    const taskSpec: TaskSpec = {
      taskId: input.ticketId,
      tenantId: input.tenantId,
      title: input.title,
      goal,
      nonGoals,
      inputs,
      constraints,
      policy,
      acceptanceCriteria:
        criteria.length > 0 ? criteria : this.buildFallbackCriteria(goal),
      risks,
      raci,
      sla,
      policyTags: tags,
      language,
    };

    const ticket: Ticket = {
      id: input.ticketId,
      tenantId: input.tenantId,
      language,
      title: input.title,
      summary: splitParagraphs(deduped)[0] ?? input.title,
      goal,
      nonGoals,
      constraints: constraints,
      policyTags: tags,
      evidenceLinks: evidence,
      ambiguities: findAmbiguousPhrases(deduped),
    };

    const clarifyingQuestions: ClarifyingQuestion[] = [];
    if (missingSignals.length > 0) {
      clarifyingQuestions.push({
        question:
          'Please provide explicit acceptance criteria or measurable verification steps.',
        reason: 'acceptance criteria gaps',
        priority: 'high',
      });
    }
    ticket.ambiguities.forEach((phrase) => {
      if (clarifyingQuestions.length >= this.clarifyingQuestionLimit) {
        return;
      }
      clarifyingQuestions.push({
        question: `Clarify the use of "${phrase}" with concrete expectations or metrics?`,
        reason: 'ambiguous phrasing',
        priority: 'medium',
      });
    });

    const validation = validateTaskSpec(taskSpec);
    if (!validation.valid) {
      validation.errors
        .slice(0, this.clarifyingQuestionLimit)
        .forEach((error) => {
          clarifyingQuestions.push({
            question: `Resolve validation error: ${error}`,
            reason: 'spec validation',
            priority: 'high',
          });
        });
    }

    return {
      ticket,
      taskSpec,
      clarifyingQuestions: clarifyingQuestions.slice(
        0,
        this.clarifyingQuestionLimit,
      ),
    };
  }

  private deriveGoal(body: string, title: string): string {
    const match = body.match(/goal\s*[:=]\s*(.+)/i);
    if (match) {
      return normalizeWhitespace(match[1]);
    }
    const firstSentence = body.split(/\.|\n/)[0];
    return normalizeWhitespace(firstSentence || title);
  }

  private deriveNonGoals(body: string): string[] {
    const matches = body.match(/(?:non-goal|out of scope)\s*[:=]\s*(.+)/gi);
    if (!matches) {
      return [];
    }
    return matches.map((entry) =>
      normalizeWhitespace(entry.split(/[:=]/)[1] ?? ''),
    );
  }

  private deriveConstraints(
    body: string,
    keyValues: Record<string, string>,
  ): TaskConstraints {
    const base = { ...this.options.defaultConstraints };
    const budget =
      extractBudgetUSD(body) ?? Number.parseFloat(keyValues['budget'] ?? '');
    const latency =
      extractLatency(body) ?? Number.parseFloat(keyValues['latency'] ?? '');
    const context =
      extractContextLimit(body) ??
      Number.parseFloat(keyValues['context'] ?? '');
    return {
      latencyP95Ms:
        Number.isFinite(latency) && latency > 0 ? latency : base.latencyP95Ms,
      budgetUSD:
        Number.isFinite(budget) && budget > 0 ? budget : base.budgetUSD,
      contextTokensMax:
        Number.isFinite(context) && context > 0
          ? context
          : base.contextTokensMax,
    };
  }

  private deriveInputs(
    body: string,
    keyValues: Record<string, string>,
  ): TaskInputReference[] {
    const entities = extractEntities(body);
    const explicit = keyValues['inputs']?.split(/,\s*/) ?? [];
    const combined = [...entities, ...explicit];
    return combined.map((entry, index) => ({
      type: entry.startsWith('http') ? 'url' : 'code',
      uri: entry,
      hash: undefined,
      estimatedTokens: 2000,
      latencyMs: 50 * (index + 1),
    }));
  }

  private deriveEvidence(body: string): EvidenceLink[] {
    const matches = body.match(/evidence\s*[:=]\s*(https?:\S+)/gi);
    if (!matches) {
      return [];
    }
    return matches.map((match, index) => {
      const [, uri] = match.split(/[:=]/);
      return {
        id: `evidence-${index + 1}`,
        description: 'submitted evidence',
        uri: uri.trim(),
      };
    });
  }

  private deriveRisks(body: string): TaskSpec['risks'] {
    const matches = body.match(/risk\s*[:=]\s*(.+)/gi);
    if (!matches) {
      return [
        {
          id: 'risk-default',
          description: 'Model cooperation drift if adjudication fails',
          severity: 'medium',
        },
      ];
    }
    return matches.map((entry, index) => ({
      id: `risk-${index + 1}`,
      description: normalizeWhitespace(entry.split(/[:=]/)[1] ?? ''),
      severity: /high/i.test(entry) ? 'high' : 'medium',
    }));
  }

  private deriveRaci(keyValues: Record<string, string>): TaskSpec['raci'] {
    const owner = keyValues['owner'] ?? 'unassigned@intelgraph';
    const reviewers = keyValues['reviewers']
      ? keyValues['reviewers']
          .split(/,\s*/)
          .map((reviewer) => reviewer || 'reviewer@intelgraph')
      : ['reviewer@intelgraph'];
    return {
      owner,
      reviewers,
    };
  }

  private deriveSla(keyValues: Record<string, string>): TaskSpec['sla'] {
    const due = keyValues['due'];
    if (due && !Number.isNaN(Date.parse(due))) {
      return { due };
    }
    const date = new Date();
    date.setDate(date.getDate() + DEFAULT_SLA_DAYS);
    return { due: date.toISOString() };
  }

  private buildFallbackCriteria(goal: string): TaskSpec['acceptanceCriteria'] {
    return [
      {
        id: 'AC-1',
        statement: `Validate that the goal \"${goal}\" is satisfied with measurable evidence.`,
        verify: 'assert',
        metric: 'qualitative',
        threshold: '1.0',
      },
    ];
  }
}
