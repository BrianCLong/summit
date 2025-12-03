import { Router } from 'express';
import { scenarioService } from '../cases/scenarios/ScenarioService.js';
import { ModificationType } from '../cases/scenarios/types.js';
import { investigationWorkflowService } from '../services/investigationWorkflowService.js';
import logger from '../config/logger.js';

const router = Router();
const routeLogger = logger.child({ name: 'ScenarioRoutes' });

/**
 * Helper to extract user from request
 */
function getUserId(req: any): string {
    return req.user?.id || req.headers['x-user-id'] || req.user?.email || 'system';
}

/**
 * GET /api/scenarios/investigation/:id
 * List scenarios for a specific investigation
 */
router.get('/investigation/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scenarios = scenarioService.getScenariosForInvestigation(id);
    res.json(scenarios);
  } catch (error) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to list scenarios');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/scenarios/:id
 * Get a specific scenario
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scenario = scenarioService.getScenario(id);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    res.json(scenario);
  } catch (error) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to get scenario');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/scenarios
 * Create a new scenario
 */
router.post('/', async (req, res) => {
  try {
    const { investigationId, name, description } = req.body;
    const userId = getUserId(req);

    if (!investigationId || !name) {
      return res.status(400).json({ error: 'investigationId and name are required' });
    }

    const scenario = await scenarioService.createScenario(investigationId, name, description, userId);
    res.status(201).json(scenario);
  } catch (error) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to create scenario');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/scenarios/:id/modifications
 * Add a modification to a scenario
 */
router.post('/:id/modifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, data, targetId } = req.body;
    const userId = getUserId(req);

    if (!type) {
        return res.status(400).json({ error: 'Modification type is required' });
    }

    const scenario = await scenarioService.addModification(id, type as ModificationType, data, targetId, userId);
    res.json(scenario);
  } catch (error) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to add modification');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/scenarios/:id/resolve
 * Resolve scenario state (simulation)
 * NOTE: Currently this endpoint expects the client to provide the base state context
 * because the investigation service only holds IDs. In a full implementation,
 * the backend would fetch this from Neo4j/Postgres.
 */
router.post('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { entities, relationships, timeline } = req.body; // Base state provided by client

        const result = scenarioService.resolveState(
            id,
            entities || [],
            relationships || [],
            timeline || []
        );
        res.json(result);
    } catch (error) {
        routeLogger.error({ error: (error as Error).message }, 'Failed to resolve scenario');
        res.status(500).json({ error: (error as Error).message });
    }
});

export default router;
