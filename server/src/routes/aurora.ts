// server/src/routes/aurora.ts
import { Router } from 'express';
import { auroraService } from '../aurora/AuroraService';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project AURORA
 *   description: API for Live Neural Lace Integration. Direct brain-computer interface.
 */

/**
 * @swagger
 * /api/aurora/implants:
 *   get:
 *     summary: Get status of all neural implants
 *     tags: [Project AURORA]
 *     responses:
 *       200:
 *         description: A list of all registered neural implants and their current status.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NeuralImplant'
 */
router.get('/implants', async (req, res, next) => {
  try {
    const status = await auroraService.getImplantStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/aurora/handshake/{implantId}:
 *   post:
 *     summary: Initiate a handshake with a neural implant
 *     tags: [Project AURORA]
 *     parameters:
 *       - in: path
 *         name: implantId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the neural implant to connect with.
 *     responses:
 *       200:
 *         description: Handshake successful, implant is online.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NeuralImplant'
 *       404:
 *         description: Implant not found.
 */
router.post('/handshake/:implantId', async (req, res, next) => {
  try {
    const { implantId } = req.params;
    const implant = await auroraService.neuralHandshake(implantId);
    res.json(implant);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/aurora/cortex-overlay:
 *   post:
 *     summary: Push a data overlay to an analyst's visual cortex
 *     tags: [Project AURORA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CortexOverlay'
 *     responses:
 *       200:
 *         description: Overlay successfully delivered.
 *       400:
 *         description: Invalid request body or target implant unavailable.
 */
router.post('/cortex-overlay', async (req, res, next) => {
    try {
        const overlayData = req.body;
        if (!overlayData.targetImplantId || !overlayData.type || !overlayData.content) {
            return res.status(400).json({ message: 'Missing required fields for cortex overlay.' });
        }
        const confirmation = await auroraService.pushToCortex(overlayData);
        res.status(200).json(confirmation);
    } catch (error) {
        next(error);
    }
});


export const auroraRouter = router;
