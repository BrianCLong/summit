// server/src/routes/necromancer.ts
import { Router } from 'express';
import { necromancerService } from '../necromancer/NecromancerService';
import { BehavioralCloneParameters } from '../necromancer/necromancer.types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project NECROMANCER
 *   description: API for Digital Afterlife Blackmail via synthetic identities.
 */

/**
 * @swagger
 * /api/necromancer/synthetics:
 *   get:
 *     summary: Get a list of all active synthetic identities
 *     tags: [Project NECROMANCER]
 *     responses:
 *       200:
 *         description: An array of all currently operating synthetic identities.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SyntheticIdentity'
 */
router.get('/synthetics', async (req, res, next) => {
  try {
    const synthetics = await necromancerService.getAllSynthetics();
    res.json(synthetics);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/necromancer/initiate:
 *   post:
 *     summary: Initiate a digital afterlife for a deceased target
 *     tags: [Project NECROMANCER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BehavioralCloneParameters'
 *     responses:
 *       201:
 *         description: Synthetic identity created and activated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyntheticIdentity'
 *       400:
 *         description: Invalid parameters provided.
 */
router.post('/initiate', async (req, res, next) => {
  try {
    const params: BehavioralCloneParameters = req.body;
    if (!params.targetId || !params.targetName || !params.digitalFootprintUris) {
      return res.status(400).json({ message: 'Missing required parameters for initiation.' });
    }
    const synthetic = await necromancerService.initiateDigitalAfterlife(params);
    res.status(201).json(synthetic);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/necromancer/synthetics/{syntheticId}/activity:
 *   get:
 *     summary: Get a log of a synthetic identity's recent activity
 *     tags: [Project NECROMANCER]
 *     parameters:
 *       - in: path
 *         name: syntheticId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the synthetic identity.
 *     responses:
 *       200:
 *         description: A list of recent activities performed by the synthetic identity.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SyntheticActivityLog'
 *       404:
 *         description: Synthetic identity not found.
 */
router.get('/synthetics/:syntheticId/activity', async (req, res, next) => {
  try {
    const { syntheticId } = req.params;
    const activity = await necromancerService.getSyntheticActivity(syntheticId);
    res.json(activity);
  } catch (error) {
    next(error);
  }
});

export const necromancerRouter = router;
