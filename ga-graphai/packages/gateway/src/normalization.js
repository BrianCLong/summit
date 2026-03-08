"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketNormalizer = void 0;
const common_types_1 = require("@ga-graphai/common-types");
const acceptanceCriteria_js_1 = require("./acceptanceCriteria.js");
const policyTagger_js_1 = require("./policyTagger.js");
const utils_js_1 = require("./utils.js");
const DEFAULT_SLA_DAYS = 7;
class TicketNormalizer {
    options;
    synthesizer = new acceptanceCriteria_js_1.AcceptanceCriteriaSynthesizer();
    tagger;
    clarifyingQuestionLimit;
    constructor(options) {
        this.options = options;
        this.tagger = new policyTagger_js_1.PolicyTagger(options.defaultPolicy);
        this.clarifyingQuestionLimit = options.clarifyingQuestionLimit ?? 3;
    }
    normalize(input) {
        const deduped = (0, utils_js_1.dedupeParagraphs)(input.body);
        const language = (0, utils_js_1.detectLanguage)(deduped);
        const keyValues = (0, utils_js_1.extractKeyValues)(deduped);
        const goal = keyValues['goal'] ?? this.deriveGoal(deduped, input.title);
        const nonGoals = this.deriveNonGoals(deduped);
        const constraints = this.deriveConstraints(deduped, keyValues);
        const inputs = this.deriveInputs(deduped, keyValues);
        const evidence = this.deriveEvidence(deduped);
        const risks = this.deriveRisks(deduped);
        const raci = this.deriveRaci(keyValues);
        const sla = this.deriveSla(keyValues);
        const { policy, tags } = this.tagger.tag(deduped, {
            retention: keyValues['retention'] ??
                this.options.defaultPolicy.retention,
            purpose: keyValues['purpose'] ??
                this.options.defaultPolicy.purpose,
            pii: /pii|personal data/i.test(deduped) || this.options.defaultPolicy.pii,
        });
        const { criteria, missingSignals } = this.synthesizer.generate(deduped, [
            keyValues['acceptance'] ?? '',
        ]);
        const taskSpec = {
            taskId: input.ticketId,
            tenantId: input.tenantId,
            title: input.title,
            goal,
            nonGoals,
            inputs,
            constraints,
            policy,
            acceptanceCriteria: criteria.length > 0 ? criteria : this.buildFallbackCriteria(goal),
            risks,
            raci,
            sla,
            policyTags: tags,
            language,
        };
        const ticket = {
            id: input.ticketId,
            tenantId: input.tenantId,
            language,
            title: input.title,
            summary: (0, utils_js_1.splitParagraphs)(deduped)[0] ?? input.title,
            goal,
            nonGoals,
            constraints: constraints,
            policyTags: tags,
            evidenceLinks: evidence,
            ambiguities: (0, utils_js_1.findAmbiguousPhrases)(deduped),
        };
        const clarifyingQuestions = [];
        if (missingSignals.length > 0) {
            clarifyingQuestions.push({
                question: 'Please provide explicit acceptance criteria or measurable verification steps.',
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
        const validation = (0, common_types_1.validateTaskSpec)(taskSpec);
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
            clarifyingQuestions: clarifyingQuestions.slice(0, this.clarifyingQuestionLimit),
        };
    }
    deriveGoal(body, title) {
        const match = body.match(/goal\s*[:=]\s*(.+)/i);
        if (match) {
            return (0, utils_js_1.normalizeWhitespace)(match[1]);
        }
        const firstSentence = body.split(/\.|\n/)[0];
        return (0, utils_js_1.normalizeWhitespace)(firstSentence || title);
    }
    deriveNonGoals(body) {
        const matches = body.match(/(?:non-goal|out of scope)\s*[:=]\s*(.+)/gi);
        if (!matches) {
            return [];
        }
        return matches.map((entry) => (0, utils_js_1.normalizeWhitespace)(entry.split(/[:=]/)[1] ?? ''));
    }
    deriveConstraints(body, keyValues) {
        const base = { ...this.options.defaultConstraints };
        const budget = (0, utils_js_1.extractBudgetUSD)(body) ?? Number.parseFloat(keyValues['budget'] ?? '');
        const latency = (0, utils_js_1.extractLatency)(body) ?? Number.parseFloat(keyValues['latency'] ?? '');
        const context = (0, utils_js_1.extractContextLimit)(body) ??
            Number.parseFloat(keyValues['context'] ?? '');
        return {
            latencyP95Ms: Number.isFinite(latency) && latency > 0 ? latency : base.latencyP95Ms,
            budgetUSD: Number.isFinite(budget) && budget > 0 ? budget : base.budgetUSD,
            contextTokensMax: Number.isFinite(context) && context > 0
                ? context
                : base.contextTokensMax,
        };
    }
    deriveInputs(body, keyValues) {
        const entities = (0, utils_js_1.extractEntities)(body);
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
    deriveEvidence(body) {
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
    deriveRisks(body) {
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
            description: (0, utils_js_1.normalizeWhitespace)(entry.split(/[:=]/)[1] ?? ''),
            severity: /high/i.test(entry) ? 'high' : 'medium',
        }));
    }
    deriveRaci(keyValues) {
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
    deriveSla(keyValues) {
        const due = keyValues['due'];
        if (due && !Number.isNaN(Date.parse(due))) {
            return { due };
        }
        const date = new Date();
        date.setDate(date.getDate() + DEFAULT_SLA_DAYS);
        return { due: date.toISOString() };
    }
    buildFallbackCriteria(goal) {
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
exports.TicketNormalizer = TicketNormalizer;
