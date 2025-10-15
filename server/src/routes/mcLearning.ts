import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import MCLearningModuleService, {
  GovernanceDecision,
  LearningEvaluationOptions,
  PatternSignal,
  SimulationScenario,
  StrategyContext,
  StrategyDefinition,
  StrategyFeedback,
} from '../services/MCLearningModuleService.js';

export interface LearningRouterOptions {
  service?: MCLearningModuleService;
}

const signalValidators = [
  body('domain').isString().notEmpty(),
  body('source').isString().notEmpty(),
  body('timestamp').isISO8601(),
  body('reliability').isFloat({ min: 0, max: 1 }),
  body('payload').isObject(),
];

const strategyValidators = [
  body('id').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('featureWeights').isObject(),
  body('riskTolerance').isFloat({ min: 0, max: 1 }),
  body('costSensitivity').isFloat({ min: 0, max: 1 }),
  body('governanceTags').isArray({ min: 1 }),
];

const evaluationValidators = [
  body('context').isObject(),
  body('context.missionProfile').isString().notEmpty(),
  body('context.riskTolerance').isFloat({ min: 0, max: 1 }),
  body('context.costSensitivity').isFloat({ min: 0, max: 1 }),
  body('context.tempo').isIn(['rapid', 'balanced', 'cautious']),
  body('options').optional().isObject(),
];

const feedbackValidators = [
  body('strategyId').isString().notEmpty(),
  body('reward').isFloat({ min: -1, max: 1 }),
  body('success').isBoolean(),
  body('metrics').isObject(),
  body('metrics.cost').isFloat({ min: 0 }),
  body('metrics.risk').isFloat({ min: 0 }),
  body('metrics.quality').isFloat({ min: 0 }),
  body('metrics.confidence').isFloat({ min: 0 }),
];

const deploymentValidators = [
  body('strategyId').isString().notEmpty(),
  body('metrics').isObject(),
  body('metrics.cost').isFloat({ min: 0 }),
  body('metrics.risk').isFloat({ min: 0 }),
  body('metrics.quality').isFloat({ min: 0 }),
  body('metrics.confidence').isFloat({ min: 0 }),
  body('context').isObject(),
  body('context.missionProfile').isString().notEmpty(),
  body('context.riskTolerance').isFloat({ min: 0, max: 1 }),
  body('context.costSensitivity').isFloat({ min: 0, max: 1 }),
  body('context.tempo').isIn(['rapid', 'balanced', 'cautious']),
];

const handleValidation = (req: Request, res: Response) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      error: 'validation_failed',
      details: result.array(),
    });
  }
};

export const createMCLearningRouter = (options: LearningRouterOptions = {}) => {
  const service = options.service ?? new MCLearningModuleService();
  const router = express.Router();

  router.post('/signals', signalValidators, (req, res) => {
    const error = handleValidation(req, res);
    if (error) return error;

    const payload = req.body as PatternSignal & { timestamp: string };
    const vector = service.ingestSignal({
      ...payload,
      timestamp: new Date(payload.timestamp),
    });
    return res.status(202).json({
      status: 'accepted',
      vector,
    });
  });

  router.post('/strategies', strategyValidators, (req, res) => {
    const error = handleValidation(req, res);
    if (error) return error;

    const definition = req.body as StrategyDefinition;
    try {
      service.registerStrategy(definition);
      return res.status(201).json({
        status: 'registered',
        strategyId: definition.id,
      });
    } catch (err) {
      return res.status(409).json({
        error: 'strategy_conflict',
        message:
          err instanceof Error ? err.message : 'Unable to register strategy',
      });
    }
  });

  router.post('/strategies/evaluate', evaluationValidators, (req, res) => {
    const error = handleValidation(req, res);
    if (error) return error;

    const context = req.body.context as StrategyContext;
    const options = (req.body.options ?? {}) as LearningEvaluationOptions;
    const scenarioInput = req.body.options?.scenario as
      | Partial<SimulationScenario>
      | undefined;

    if (scenarioInput) {
      options.scenario = {
        id: scenarioInput.id ?? 'custom-scenario',
        name: scenarioInput.name ?? 'Ad-hoc Scenario',
        durationHours: Number(scenarioInput.durationHours ?? 0),
        environment: scenarioInput.environment ?? {
          volatility: 0.5,
          adversarySkill: 0.5,
          supportLevel: 0.5,
        },
        objectives: scenarioInput.objectives ?? [],
      };
    }

    const evaluation = service.evaluateStrategies(context, options);
    return res.status(200).json(evaluation);
  });

  router.get('/strategies', (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const diagnostics = service.getStrategyDiagnostics(id);

    if (id && diagnostics.length === 0) {
      return res.status(404).json({
        error: 'strategy_not_found',
        message: `Strategy ${id} not registered`,
      });
    }

    return res.status(200).json({
      strategies: diagnostics,
    });
  });

  router.post('/strategies/feedback', feedbackValidators, (req, res) => {
    const error = handleValidation(req, res);
    if (error) return error;

    const feedback = req.body as StrategyFeedback;
    try {
      service.submitFeedback(feedback);
      return res.status(200).json({ status: 'recorded' });
    } catch (err) {
      return res.status(404).json({
        error: 'strategy_not_found',
        message: err instanceof Error ? err.message : 'Unknown strategy',
      });
    }
  });

  router.post('/strategies/deploy', deploymentValidators, (req, res) => {
    const error = handleValidation(req, res);
    if (error) return error;

    const { strategyId, metrics, context } = req.body as {
      strategyId: string;
      metrics: StrategyFeedback['metrics'];
      context: StrategyContext;
    };

    try {
      const decision: GovernanceDecision = service.requestDeployment(
        strategyId,
        metrics,
        context,
      );
      return res.status(decision.approved ? 200 : 403).json(decision);
    } catch (err) {
      return res.status(404).json({
        error: 'deployment_failed',
        message: err instanceof Error ? err.message : 'Unknown strategy',
      });
    }
  });

  router.get('/telemetry', (_req, res) => {
    return res.status(200).json(service.getTelemetrySnapshot());
  });

  router.get('/governance/audit', (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    return res.status(200).json({
      audit: service.getGovernanceAudit(Number.isNaN(limit) ? 20 : limit),
    });
  });

  return router;
};

const router = createMCLearningRouter();

export default router;
