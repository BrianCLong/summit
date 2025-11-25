// server/src/routes/phantom_limb.ts
import { Router } from 'express';
import { phantomLimbService } from '../phantom_limb/PhantomLimbService';
import { AnalystArtifacts } from '../phantom_limb/phantom_limb.types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project PHANTOM LIMB
 *   description: API for resurrecting and interacting with deceased master analysts.
 */

/**
 * @swagger
 * /api/phantom-limb/analysts:
 *   get:
 *     summary: Get all currently resurrected and online analysts
 *     tags: [Project PHANTOM LIMB]
 *     responses:
 *       200:
 *         description: A list of all active Digital Ghost agents.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DigitalGhost'
 */
router.get('/analysts', async (req, res, next) => {
  try {
    const analysts = await phantomLimbService.getOnlineAnalysts();
    res.json(analysts);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/phantom-limb/reconstitute:
 *   post:
 *     summary: Resurrect a new analyst from their digital artifacts
 *     tags: [Project PHANTOM LIMB]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalystArtifacts'
 *     responses:
 *       201:
 *         description: Reconstitution process initiated successfully. Returns the new Digital Ghost.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DigitalGhost'
 *       400:
 *         description: Invalid artifact data provided.
 */
router.post('/reconstitute', async (req, res, next) => {
  try {
    const artifacts: AnalystArtifacts = req.body;
    if (!artifacts.sourceAnalystId || !artifacts.sourceAnalystName || !artifacts.artifactUris) {
      return res.status(400).json({ message: 'Missing required artifact data.' });
    }
    const newGhost = await phantomLimbService.reconstituteCognition(artifacts);
    res.status(201).json(newGhost);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/phantom-limb/query/{ghostId}:
 *   post:
 *     summary: Pose a query to a specific resurrected analyst
 *     tags: [Project PHANTOM LIMB]
 *     parameters:
 *       - in: path
 *         name: ghostId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the Digital Ghost to query.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: The analytical question to ask the ghost.
 *             required:
 *               - query
 *     responses:
 *       200:
 *         description: The analytical response from the Digital Ghost.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GhostQueryResponse'
 *       404:
 *         description: Digital Ghost not found or is not online.
 */
router.post('/query/:ghostId', async (req, res, next) => {
  try {
    const { ghostId } = req.params;
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'A query is required.' });
    }
    const response = await phantomLimbService.queryDigitalGhost(ghostId, query);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export const phantomLimbRouter = router;
