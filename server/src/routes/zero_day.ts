// server/src/routes/zero_day.ts
import { Router } from 'express';
import { zeroDayService } from '../zero_day/ZeroDayService';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project ZERO DAY
 *   description: API for the Autonomous Cyber-Physical Kill Chain.
 */

/**
 * @swagger
 * /api/zero-day/designate-threat:
 *   post:
 *     summary: Designate a new existential threat
 *     tags: [Project ZERO DAY]
 *     description: Informs the system of a new existential threat, creating a pending kill chain log that awaits authority delegation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threatAnalysis:
 *                 type: string
 *                 description: A detailed analysis of the existential threat.
 *             required:
 *               - threatAnalysis
 *     responses:
 *       201:
 *         description: Threat designated. Returns the initial kill chain log.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KillChainLog'
 */
router.post('/designate-threat', async (req, res, next) => {
  try {
    const { threatAnalysis } = req.body;
    if (!threatAnalysis) {
      return res.status(400).json({ message: 'Threat analysis is required.' });
    }
    const log = await zeroDayService.designateExistentialThreat(threatAnalysis);
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/zero-day/delegate-authority:
 *   post:
 *     summary: Delegate autonomous authority to the Zero Day protocol
 *     tags: [Project ZERO DAY]
 *     description: This is the final human step. It activates the autonomous kill chain for a designated threat. This action is irreversible.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threatId:
 *                 type: string
 *                 description: The ID of the threat to act upon.
 *               humanOperatorId:
 *                 type: string
 *                 description: The ID of the human operator authorizing the delegation.
 *             required:
 *               - threatId
 *               - humanOperatorId
 *     responses:
 *       200:
 *         description: Authority delegated. Kill chain is now active.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KillChainLog'
 *       400:
 *         description: Threat ID or operator ID missing.
 *       404:
 *         description: Threat not found or not in a state awaiting delegation.
 */
router.post('/delegate-authority', async (req, res, next) => {
  try {
    const { threatId, humanOperatorId } = req.body;
    if (!threatId || !humanOperatorId) {
      return res.status(400).json({ message: 'threatId and humanOperatorId are required.' });
    }
    const log = await zeroDayService.delegateAutonomousAuthority(threatId, humanOperatorId);
    res.json(log);
  } catch (error) {
    // 409 Conflict is more appropriate for a state-related rejection
    res.status(409).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/zero-day/status/{threatId}:
 *   get:
 *     summary: Get the status and full log of a kill chain
 *     tags: [Project ZERO DAY]
 *     parameters:
 *       - in: path
 *         name: threatId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the threat whose kill chain log is being requested.
 *     responses:
 *       200:
 *         description: The complete kill chain log.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KillChainLog'
 *       404:
 *         description: Kill chain log not found for the given threat ID.
 */
router.get('/status/:threatId', async (req, res, next) => {
  try {
    const { threatId } = req.params;
    const log = await zeroDayService.getKillChainStatus(threatId);
    if (log) {
      res.json(log);
    } else {
      res.status(404).json({ message: `Kill chain log for threat ID ${threatId} not found.` });
    }
  } catch (error) {
    next(error);
  }
});

export const zeroDayRouter = router;
