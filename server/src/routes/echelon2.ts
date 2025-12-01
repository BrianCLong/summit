// server/src/routes/echelon2.ts
import { Router } from 'express';
import { echelon2Service } from '../echelon2/Echelon2Service';
import { eDNAReading } from '../echelon2/echelon2.types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project ECHELON-2
 *   description: API for the Global Passive DNA Sniffing Grid.
 */

/**
 * @swagger
 * /api/echelon2/ingest:
 *   post:
 *     summary: Ingest a new environmental DNA (eDNA) sample
 *     tags: [Project ECHELON-2]
 *     description: Submits a raw eDNA reading from a collector for processing and matching against the target genome database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/eDNAReading'
 *     responses:
 *       201:
 *         description: A match was found, and a new presence confirmation was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhysicalPresenceConfirmation'
 *       200:
 *         description: The sample was processed successfully, but no match was found.
 *       400:
 *         description: Invalid eDNA reading data provided.
 */
router.post('/ingest', async (req, res, next) => {
  try {
    const reading: eDNAReading = req.body;
    if (!reading.readingId || !reading.collectorId || !reading.location || !reading.dnaSequences) {
      return res.status(400).json({ message: 'Missing required eDNA reading data.' });
    }
    const confirmation = await echelon2Service.processEnvironmentalSample(reading);
    if (confirmation) {
      res.status(201).json(confirmation);
    } else {
      res.status(200).json({ message: 'Sample processed, no match found.' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/echelon2/confirmations:
 *   get:
 *     summary: Get all physical presence confirmations
 *     tags: [Project ECHELON-2]
 *     responses:
 *       200:
 *         description: A list of all confirmed target presences.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PhysicalPresenceConfirmation'
 */
router.get('/confirmations', async (req, res, next) => {
  try {
    const confirmations = await echelon2Service.getAllConfirmations();
    res.json(confirmations);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/echelon2/confirmations/{targetId}:
 *   get:
 *     summary: Get all presence confirmations for a specific target
 *     tags: [Project ECHELON-2]
 *     parameters:
 *       - in: path
 *         name: targetId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the High-Value Target (HVT).
 *     responses:
 *       200:
 *         description: A list of confirmations for the specified target.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PhysicalPresenceConfirmation'
 */
router.get('/confirmations/:targetId', async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const confirmations = await echelon2Service.getConfirmationsForTarget(targetId);
    res.json(confirmations);
  } catch (error) {
    next(error);
  }
});

export const echelon2Router = router;
