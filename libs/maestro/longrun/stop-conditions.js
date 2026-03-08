"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompletionVerified = exports.evaluateStopConditions = exports.initialStopState = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const normalizeSignal = (message) => message.trim().toLowerCase().replace(/\s+/g, ' ');
const isPlanComplete = (iteration) => {
    const plan = iteration.planStatus;
    if (!plan) {
        return false;
    }
    return plan.total > 0 && plan.completed >= plan.total;
};
const areQualityGatesGreen = (iteration) => {
    const gates = iteration.qualityGates;
    if (!gates) {
        return false;
    }
    return gates.failed.length === 0;
};
const isMeaningfulDiff = (iteration) => {
    const diff = iteration.diffSummary;
    if (!diff) {
        return false;
    }
    if (diff.meaningful !== undefined) {
        return diff.meaningful;
    }
    if (diff.changedLines !== undefined) {
        return diff.changedLines > 0;
    }
    return Boolean(diff.hash);
};
const initialStopState = () => ({
    consecutiveDoneSignals: 0,
    stallCount: 0,
    diffHashCounts: {},
    errorCounts: {},
    lastMeaningfulIteration: 0,
});
exports.initialStopState = initialStopState;
const evaluateStopConditions = (options) => {
    const { iteration, state, policy, budget, workspaceRoot } = options;
    const stopFile = node_path_1.default.join(workspaceRoot, policy.manualStopFile);
    if (node_fs_1.default.existsSync(stopFile)) {
        return { status: 'stop', reason: 'manual-stop', detail: stopFile };
    }
    if (iteration.iteration >= policy.maxIterations) {
        return { status: 'stop', reason: 'max-iterations' };
    }
    const budgetStatus = budget.isBudgetExceeded();
    if (budgetStatus.exceeded) {
        return { status: 'stop', reason: 'budget-exhausted', detail: budgetStatus.reason };
    }
    const doneSignal = Boolean(iteration.doneSignal);
    if (doneSignal) {
        state.consecutiveDoneSignals += 1;
    }
    else {
        state.consecutiveDoneSignals = 0;
    }
    if (isMeaningfulDiff(iteration)) {
        state.stallCount = 0;
        state.lastMeaningfulIteration = iteration.iteration;
    }
    else {
        state.stallCount += 1;
        if (state.stallCount >= policy.maxStallIterations) {
            return { status: 'stop', reason: 'stall-detected' };
        }
    }
    if (iteration.diffSummary?.hash) {
        const hash = iteration.diffSummary.hash;
        state.diffHashCounts[hash] = (state.diffHashCounts[hash] ?? 0) + 1;
        if (state.diffHashCounts[hash] >= policy.maxRepeatDiffs) {
            return { status: 'stop', reason: 'oscillation-diff' };
        }
    }
    if (iteration.errors && iteration.errors.length > 0) {
        for (const error of iteration.errors) {
            const key = normalizeSignal(error);
            state.errorCounts[key] = (state.errorCounts[key] ?? 0) + 1;
            if (state.errorCounts[key] >= policy.maxRepeatErrors) {
                return { status: 'stop', reason: 'oscillation-error', detail: key };
            }
        }
    }
    const verifiedCompletion = isPlanComplete(iteration) && areQualityGatesGreen(iteration);
    if (verifiedCompletion) {
        if (state.consecutiveDoneSignals >= policy.requireConsecutiveDone) {
            return { status: 'stop', reason: 'verified-completion' };
        }
    }
    return { status: 'continue', reason: 'in-progress' };
};
exports.evaluateStopConditions = evaluateStopConditions;
const isCompletionVerified = (iteration) => isPlanComplete(iteration) && areQualityGatesGreen(iteration);
exports.isCompletionVerified = isCompletionVerified;
