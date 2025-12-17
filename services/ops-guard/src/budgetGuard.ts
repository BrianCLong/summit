import { NextFunction, Request, Response } from 'express';
import { OpsGuardConfig } from './config.js';
import { completeQuery, startQueryTimer, trackCostPerInsight } from './metrics.js';
import { evaluatePlan } from './costGovernor.js';
import { createSlowKiller } from './slowQueryKiller.js';
import { QueryPlan } from './types.js';
import { Logger } from './logger.js';

export function buildBudgetGuard(config: OpsGuardConfig, logger: Logger) {
  return async function budgetGuard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const plan = req.body as QueryPlan;
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
      logger.warn(
        { estimatedDuration, budget: config.latencyBudgetMs },
        'Latency budget exceeded'
      );
    }

    let killed = false;
    const stopTimer = startQueryTimer();
    const killer = createSlowKiller<{ durationMs: number }>(config.slowQueryKillMs, () => {
      killed = true;
      completeQuery(config.slowQueryKillMs, safeConcurrency);
      res.status(504).json({
        status: 'terminated',
        reason: `Query exceeded ${config.slowQueryKillMs}ms safety window`
      });
    });

    try {
      const result = await killer.guard(processQuery(plan, logger, safeConcurrency));
      if (killed) return;

      const durationMs = result?.durationMs ?? estimatedDuration;
      completeQuery(durationMs, safeConcurrency);
      trackCostPerInsight(plan.planCost ?? 0, expectedInsights);

      const governor = evaluatePlan(plan);
      res.locals.planGovernance = governor;
      res.locals.durationMs = durationMs;
      stopTimer();
      killer.clear();
      next();
    } catch (err) {
      killer.clear();
      stopTimer();
      logger.error({ err }, 'Budget guard failed');
      if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: 'Guard failure' });
      }
    }
  };
}

async function processQuery(
  plan: QueryPlan,
  logger: Logger,
  safeConcurrency: number
): Promise<{ durationMs: number }> {
  const simulatedMs = Math.min(plan.estimatedMs ?? 200, 2000);
  await new Promise((resolve) => setTimeout(resolve, simulatedMs));
  logger.info(
    {
      cost: plan.planCost,
      estimatedMs: plan.estimatedMs,
      concurrency: safeConcurrency,
      queryId: plan.queryId
    },
    'Query processed under guard'
  );
  return { durationMs: simulatedMs };
}
