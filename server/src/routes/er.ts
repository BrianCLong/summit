import express from 'express';
import { EntityResolutionV2Service } from '../services/er/EntityResolutionV2Service.js';
import { getNeo4jDriver as getDriver } from '../config/database.js';

const router = express.Router();
const erService = new EntityResolutionV2Service();

// GET /er/candidates
// Returns potential merge candidates
router.get('/candidates', async (req, res) => {
  const driver = getDriver();
  const session = driver.session();
  try {
    const candidates = await erService.findCandidates(session);
    res.json(candidates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// POST /er/merge
// Merges entities. Body: { masterId, mergeIds, rationale }
router.post('/merge', async (req, res) => {
  const driver = getDriver();
  const session = driver.session();
  try {
    const {
      masterId,
      mergeIds,
      rationale,
      guardrailDatasetId,
      guardrailOverrideReason,
    } = req.body;
    // Assuming req.user is populated by auth middleware
    const userContext = (req as any).user || { userId: 'anonymous' };

    const result = await erService.merge(session, {
      masterId,
      mergeIds,
      userContext,
      rationale,
      guardrailDatasetId,
      guardrailOverrideReason,
    });

    res.json({ success: true, guardrails: result.guardrails, overrideUsed: result.overrideUsed });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// GET /er/guardrails
// Returns guardrail evaluation metrics for current fixtures
router.get('/guardrails', async (req, res) => {
  try {
    const datasetId = req.query.datasetId as string | undefined;
    const guardrails = erService.evaluateGuardrails(datasetId);
    res.json(guardrails);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /er/split
// Reverses a merge. Body: { decisionId }
router.post('/split', async (req, res) => {
  const driver = getDriver();
  const session = driver.session();
  try {
    const { decisionId } = req.body;
    const userContext = (req as any).user || { userId: 'anonymous' };

    await erService.split(session, decisionId, userContext);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// POST /er/explain
// Explains similarity. Body: { entityA, entityB }
router.post('/explain', (req, res) => {
  try {
    const { entityA, entityB } = req.body;
    const explanation = erService.explain(entityA, entityB);
    res.json(explanation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
