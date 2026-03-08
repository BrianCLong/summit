"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/intel-graph.ts
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const IntelGraphService_js_1 = require("../services/IntelGraphService.js");
const auth_js_1 = require("../middleware/auth.js");
const tenantContext_js_1 = require("../middleware/tenantContext.js");
const router = express_1.default.Router();
// --- Input Validation Schemas ---
const createEntitySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    description: zod_1.z.string().optional(),
});
const createClaimSchema = zod_1.z.object({
    statement: zod_1.z.string().min(1, 'Statement is required'),
    confidence: zod_1.z.number().min(0).max(1),
    entityId: zod_1.z.string().uuid('Invalid Entity ID format'),
});
const attachEvidenceSchema = zod_1.z.object({
    claimId: zod_1.z.string().uuid('Invalid Claim ID format'),
    sourceURI: zod_1.z.string().url('Invalid source URI'),
    hash: zod_1.z.string().min(1, 'Hash is required'),
    content: zod_1.z.string().min(1, 'Content is required'),
});
const tagPolicySchema = zod_1.z.object({
    targetNodeId: zod_1.z.string().uuid('Invalid Target Node ID format'),
    label: zod_1.z.string().min(1, 'Label is required'),
    sensitivity: zod_1.z.enum(['public', 'internal', 'confidential', 'secret', 'top-secret']),
});
// --- Middleware ---
/**
 * Middleware to create and inject a singleton instance of the IntelGraphService
 * into the request object for use by route handlers.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @param {express.NextFunction} next - The next middleware function.
 */
const intelGraphServiceMiddleware = (req, res, next) => {
    req.intelGraphService = IntelGraphService_js_1.IntelGraphService.getInstance();
    next();
};
// Apply security and service middleware to all routes in this router.
router.use(auth_js_1.ensureAuthenticated, tenantContext_js_1.tenantContextMiddleware, intelGraphServiceMiddleware);
// --- API Endpoints ---
/**
 * @openapi
 * /api/intel-graph/entities:
 *   post:
 *     summary: Create a new Entity
 *     tags: [IntelGraph]
 *     description: Creates a new Entity node in the provenance graph.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEntity'
 *     responses:
 *       '201':
 *         description: Successfully created the entity. Returns the new entity object.
 *       '400':
 *         description: Bad Request - Invalid input data.
 *       '401':
 *         description: Unauthorized.
 */
router.post('/entities', async (req, res, next) => {
    try {
        const { name, description } = createEntitySchema.parse(req.body);
        const owner = req.user.id;
        const tenantId = req.user.tenantId;
        const entity = await req.intelGraphService.createEntity({ name, description }, owner, tenantId);
        res.status(201).json(entity);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /api/intel-graph/claims:
 *   post:
 *     summary: Create a new Claim
 *     tags: [IntelGraph]
 *     description: Creates a new Claim node and links it to an existing Entity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClaim'
 *     responses:
 *       '201':
 *         description: Successfully created the claim.
 *       '404':
 *         description: The specified parent Entity was not found.
 */
router.post('/claims', async (req, res, next) => {
    try {
        const { statement, confidence, entityId } = createClaimSchema.parse(req.body);
        const owner = req.user.id;
        const tenantId = req.user.tenantId;
        const claim = await req.intelGraphService.createClaim({ statement, confidence, entityId }, owner, tenantId);
        res.status(201).json(claim);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /api/intel-graph/evidence:
 *   post:
 *     summary: Attach new Evidence to a Claim
 *     tags: [IntelGraph]
 *     description: Creates a new Evidence node and links it to an existing Claim.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttachEvidence'
 *     responses:
 *       '201':
 *         description: Successfully attached the evidence.
 *       '404':
 *         description: The specified parent Claim was not found.
 */
router.post('/evidence', async (req, res, next) => {
    try {
        const { claimId, sourceURI, hash, content } = attachEvidenceSchema.parse(req.body);
        const owner = req.user.id;
        const tenantId = req.user.tenantId;
        const evidence = await req.intelGraphService.attachEvidence({ claimId, sourceURI, hash, content }, owner, tenantId);
        res.status(201).json(evidence);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /api/intel-graph/policies:
 *   post:
 *     summary: Attach a PolicyLabel to a node
 *     tags: [IntelGraph]
 *     description: Creates a new PolicyLabel node and links it to any existing node in the graph.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagPolicy'
 *     responses:
 *       '201':
 *         description: Successfully tagged the node with a policy.
 *       '404':
 *         description: The specified target node was not found.
 */
router.post('/policies', async (req, res, next) => {
    try {
        const { targetNodeId, label, sensitivity } = tagPolicySchema.parse(req.body);
        const owner = req.user.id;
        const tenantId = req.user.tenantId;
        const policy = await req.intelGraphService.tagPolicy({ label, sensitivity }, targetNodeId, owner, tenantId);
        res.status(201).json(policy);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /api/intel-graph/decisions/{id}/provenance:
 *   get:
 *     summary: Get the full provenance for a Decision
 *     tags: [IntelGraph]
 *     description: Retrieves a Decision and the full tree of claims and evidence that informed it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the Decision to retrieve.
 *     responses:
 *       '200':
 *         description: The decision and its complete provenance trail.
 *       '404':
 *         description: The specified Decision was not found.
 */
router.get('/decisions/:id/provenance', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const provenance = await req.intelGraphService.getDecisionProvenance(id, tenantId);
        res.status(200).json(provenance);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /api/intel-graph/entities/{id}/claims:
 *   get:
 *     summary: Get all claims and policies for an Entity
 *     tags: [IntelGraph]
 *     description: Retrieves an Entity and all associated Claims, including any PolicyLabels attached to them.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the Entity to retrieve.
 *     responses:
 *       '200':
 *         description: The entity and its claims.
 *       '404':
 *         description: The specified Entity was not found.
 */
router.get('/entities/:id/claims', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const entityClaims = await req.intelGraphService.getEntityClaims(id, tenantId);
        res.status(200).json(entityClaims);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
