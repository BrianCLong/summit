"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardedGenerator = exports.SelfRefineLoop = exports.InstructionCompiler = exports.ContextPlanner = void 0;
class ContextPlanner {
    plan(task) {
        const budgetTokens = task.constraints.contextTokensMax;
        const sorted = [...task.inputs].sort((a, b) => (a.estimatedTokens ?? 0) - (b.estimatedTokens ?? 0));
        const selected = [];
        let tokenSum = 0;
        let latency = 0;
        for (const input of sorted) {
            const tokens = input.estimatedTokens ?? 1000;
            if (tokenSum + tokens > budgetTokens) {
                continue;
            }
            tokenSum += tokens;
            latency += input.latencyMs ?? 50;
            selected.push(input);
        }
        return {
            selected,
            totalTokens: tokenSum,
            estimatedLatencyMs: latency,
        };
    }
}
exports.ContextPlanner = ContextPlanner;
class InstructionCompiler {
    compile(task, plan, clarifications = []) {
        const system = [
            'You are an IntelGraph orchestration agent.',
            'Respect policy tags and guardrails.',
            `Do not exceed ${task.constraints.contextTokensMax} tokens of context.`,
        ].join(' ');
        const developer = [
            `Goal: ${task.goal}.`,
            `Acceptance Criteria: ${task.acceptanceCriteria.map((ac) => `${ac.id}=>${ac.statement}`).join(' | ')}`,
            `Inputs: ${plan.selected.map((input) => `${input.type}:${input.uri}`).join(', ')}`,
            clarifications.length > 0
                ? `Clarifications: ${clarifications.join('; ')}`
                : undefined,
        ]
            .filter(Boolean)
            .join(' ');
        const user = `Deliver artifacts that satisfy ${task.acceptanceCriteria.length} acceptance criteria with provenance.`;
        return { system, developer, user };
    }
}
exports.InstructionCompiler = InstructionCompiler;
class SelfRefineLoop {
    maxIterations;
    threshold;
    constructor(maxIterations = 3, threshold = 0.85) {
        this.maxIterations = maxIterations;
        this.threshold = threshold;
    }
    async refine(initialDraft, generator, critics) {
        let draft = initialDraft;
        const history = [];
        for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
            const critiques = await Promise.all(critics.map((critic) => critic(draft)));
            critiques.forEach((critique) => {
                history.push({
                    axis: critique.axis,
                    score: critique.score,
                    rationale: critique.notes,
                });
            });
            const minScore = Math.min(...critiques.map((critique) => critique.score));
            if (minScore >= this.threshold) {
                break;
            }
            draft = await generator(draft, critiques);
        }
        return { output: draft, scores: history };
    }
}
exports.SelfRefineLoop = SelfRefineLoop;
const SECRET_PATTERNS = [
    /aws[_-]?secret/i,
    /password/i,
    /api[_-]?key/i,
    /\b\d{3}-\d{2}-\d{4}\b/,
];
class GuardedGenerator {
    guard(content) {
        let sanitized = content;
        const redactions = [];
        SECRET_PATTERNS.forEach((pattern) => {
            if (pattern.test(sanitized)) {
                sanitized = sanitized.replace(pattern, '[REDACTED]');
                redactions.push(pattern.source);
            }
        });
        return { sanitized, redactions };
    }
    enforce(mode, content, scores = [], evidence = []) {
        const { sanitized, redactions } = this.guard(content);
        const artifact = {
            mode,
            content: sanitized,
            supportingEvidence: evidence,
            acceptanceCriteriaSatisfied: scores
                .filter((score) => score.score >= 0.9)
                .map((score) => score.axis),
            residualRisks: redactions,
        };
        return { artifact, redactions };
    }
}
exports.GuardedGenerator = GuardedGenerator;
