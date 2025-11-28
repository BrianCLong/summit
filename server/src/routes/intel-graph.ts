// server/src/routes/intel-graph.ts
import express from 'express';
import { z } from 'zod/v4';
import { IntelGraphService } from '../services/IntelGraphService';
import { ensureAuthenticated } from '../middleware/auth';
import { tenantContext } from '../middleware/tenantContext';

const router = express.Router();

// Input validation schemas
const createEntitySchema = z.object({
  name: z.string(),
  description: z.string(),
});

const createClaimSchema = z.object({
  statement: z.string(),
  confidence: z.number().min(0).max(1),
  entityId: z.string().uuid(),
});

const attachEvidenceSchema = z.object({
  claimId: z.string().uuid(),
  sourceURI: z.string().url(),
  hash: z.string(),
  content: z.string(),
});

const tagPolicySchema = z.object({
  targetNodeId: z.string().uuid(),
  label: z.string(),
  sensitivity: z.enum(['public', 'internal', 'confidential', 'secret', 'top-secret']),
});

// Middleware to inject the service
const intelGraphServiceMiddleware = (req, res, next) => {
  req.intelGraphService = IntelGraphService.getInstance();
  next();
};

router.use(ensureAuthenticated, tenantContext, intelGraphServiceMiddleware);

/**
 * @openapi
 * /intel-graph/entities:
 *   post:
 *     summary: Create a new Entity
 *     tags: [IntelGraph]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created entity.
 */
router.post('/entities', async (req, res, next) => {
  try {
    const { name, description } = createEntitySchema.parse(req.body);
    const owner = req.user.id;
    const tenantId = req.user.tenantId;
    const entity = await req.intelGraphService.createEntity({ name, description }, owner, tenantId);
    res.status(201).json(entity);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /intel-graph/claims:
 *   post:
 *     summary: Create a new Claim
 *     tags: [IntelGraph]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statement:
 *                 type: string
 *               confidence:
 *                 type: number
 *               entityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created claim.
 */
router.post('/claims', async (req, res, next) => {
  try {
    const { statement, confidence, entityId } = createClaimSchema.parse(req.body);
    const owner = req.user.id;
    const tenantId = req.user.tenantId;
    const claim = await req.intelGraphService.createClaim({ statement, confidence, entityId }, owner, tenantId);
    res.status(201).json(claim);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /intel-graph/evidence:
 *   post:
 *     summary: Attach new Evidence to a Claim
 *     tags: [IntelGraph]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               claimId:
 *                 type: string
 *               sourceURI:
 *                 type: string
 *               hash:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created evidence.
 */
router.post('/evidence', async (req, res, next) => {
    try {
        const { claimId, sourceURI, hash, content } = attachEvidenceSchema.parse(req.body);
        const owner = req.user.id;
        const tenantId = req.user.tenantId;
        const evidence = await req.intelGraphService.attachEvidence({ claimId, sourceURI, hash, content }, owner, tenantId);
        res.status(201).json(evidence);
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /intel-graph/policies:
 *   post:
 *     summary: Attach a new PolicyLabel to any node
 *     tags: [IntelGraph]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetNodeId:
 *                 type: string
 *               label:
 *                 type: string
 *               sensitivity:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created policy label.
 */
router.post('/policies', async (req, res, next) => {
    try {
        const { targetNodeId, label, sensitivity } = tagPolicySchema.parse(req.body);
        const owner = req.user.id;
        const tenantId = req.user.tenantId;
        const policy = await req.intelGraphService.tagPolicy({ label, sensitivity }, targetNodeId, owner, tenantId);
        res.status(201).json(policy);
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /intel-graph/decisions/{id}/provenance:
 *   get:
 *     summary: Get the provenance for a Decision
 *     tags: [IntelGraph]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The decision and its provenance trail.
 */
router.get('/decisions/:id/provenance', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const provenance = await req.intelGraphService.getDecisionProvenance(id, tenantId);
        res.status(200).json(provenance);
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /intel-graph/entities/{id}/claims:
 *   get:
 *     summary: Get all claims for an Entity
 *     tags: [IntelGraph]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The entity and its claims.
 */
router.get('/entities/:id/claims', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const entityClaims = await req.intelGraphService.getEntityClaims(id, tenantId);
        res.status(200).json(entityClaims);
    } catch (error) {
        next(error);
    }
});

export default router;
