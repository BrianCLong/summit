import express from 'express';
import { GraphStore } from '../store.js';
import { FusionEngine } from '../fusion/FusionEngine.js';
import { CKPEngine } from '../ckp/CKPEngine.js';
import { parseDSL, buildCypherFromDSL } from '../dsl/execution.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { GraphEntity } from '../types.js';

const router = express.Router();
const store = new GraphStore();
const fusion = new FusionEngine();
const ckp = new CKPEngine();

// Middleware to ensure tenant context
router.use(ensureAuthenticated);

/**
 * @api {post} /api/intelgraph/ingest Ingest Data (Fusion)
 */
router.post('/ingest', async (req, res) => {
  try {
    const payload = req.body;
    // Security: Validate payload schema (FusionPayload)
    // In production: Zod validation here.

    // Enforce tenantId from auth context
    if (payload.tenantId !== req.user?.tenantId) {
       return res.status(403).json({ error: 'Tenant mismatch' });
    }

    await fusion.ingest(payload);
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @api {post} /api/intelgraph/query Execute DSL Query
 */
router.post('/query', async (req, res) => {
  try {
    const dsl = req.body.dsl; // JSON string or object
    const queryObj = typeof dsl === 'string' ? parseDSL(dsl) : dsl;
    const { cypher, params } = buildCypherFromDSL(queryObj, req.user!.tenantId);

    const results = await store.runCypher(cypher, params);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @api {post} /api/intelgraph/ckp/:planId Execute Knowledge Plan
 */
router.post('/ckp/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const inputs = req.body;

    // 1. Fetch Plan definition (Built-ins for now)
    let plan = CKPEngine.DEPENDENCY_BLAST_RADIUS; // Hardcoded lookup for demo
    if (planId !== 'ckp_blast_radius') {
        // In real impl, look up plan from GraphStore or Registry
        return res.status(404).json({ error: 'Plan not found' });
    }

    const result = await ckp.executePlan(plan, inputs, req.user!.tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @api {get} /api/intelgraph/analytics/centrality Simple Centrality
 */
router.get('/analytics/centrality', async (req, res) => {
    try {
        // Simple degree centrality via Cypher
        const cypher = `
            MATCH (n:GraphNode { tenantId: $tenantId })-[r]-()
            RETURN n.globalId as id, n.attributes.name as name, count(r) as degree
            ORDER BY degree DESC LIMIT 20
        `;
        const results = await store.runCypher(cypher, { tenantId: req.user!.tenantId });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
