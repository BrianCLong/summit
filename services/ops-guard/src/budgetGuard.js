"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBudgetGuard = buildBudgetGuard;
const metrics_js_1 = require("./metrics.js");
const costGovernor_js_1 = require("./costGovernor.js");
const slowQueryKiller_js_1 = require("./slowQueryKiller.js");
function buildBudgetGuard(config, logger) {
    return async function budgetGuard(req, res, next) {
        const plan = req.body;
        const safeConcurrency = plan.safeConcurrency ?? 10;
        const estimatedDuration = plan.estimatedMs ?? config.latencyBudgetMs;
        const cost = plan.planCost ?? 0;
        const expectedInsights = plan.expectedInsights ?? 1;
        if (cost > config.costBudget) {
            logger.warn({ cost, budget: config.costBudget }, 'Cost budget exceeded');
            res.status(429).json({
                status: 'budget-blocked',
                reason: `Plan cost ${cost} exceeds budget ${config.costBudget}`
            });
            return;
        }
        if (estimatedDuration > config.latencyBudgetMs) {
            logger.warn({ estimatedDuration, budget: config.latencyBudgetMs }, 'Latency budget exceeded');
        }
        let killed = false;
        const stopTimer = (0, metrics_js_1.startQueryTimer)();
        const killer = (0, slowQueryKiller_js_1.createSlowKiller)(config.slowQueryKillMs, () => {
            killed = true;
            (0, metrics_js_1.completeQuery)(config.slowQueryKillMs, safeConcurrency);
            res.status(504).json({
                status: 'terminated',
                reason: `Query exceeded ${config.slowQueryKillMs}ms safety window`
            });
        });
        try {
            const result = await killer.guard(processQuery(plan, logger, safeConcurrency));
            if (killed)
                return;
            const durationMs = result?.durationMs ?? estimatedDuration;
            (0, metrics_js_1.completeQuery)(durationMs, safeConcurrency);
            (0, metrics_js_1.trackCostPerInsight)(plan.planCost ?? 0, expectedInsights);
            const governor = (0, costGovernor_js_1.evaluatePlan)(plan);
            res.locals.planGovernance = governor;
            res.locals.durationMs = durationMs;
            stopTimer();
            killer.clear();
            next();
        }
        catch (err) {
            killer.clear();
            stopTimer();
            logger.error({ err }, 'Budget guard failed');
            if (!res.headersSent) {
                res.status(500).json({ status: 'error', message: 'Guard failure' });
            }
        }
    };
}
async function processQuery(plan, logger, safeConcurrency) {
    const simulatedMs = Math.min(plan.estimatedMs ?? 200, 2000);
    await new Promise((resolve) => setTimeout(resolve, simulatedMs));
    logger.info({
        cost: plan.planCost,
        estimatedMs: plan.estimatedMs,
        concurrency: safeConcurrency,
        queryId: plan.queryId
    }, 'Query processed under guard');
    return { durationMs: simulatedMs };
}
