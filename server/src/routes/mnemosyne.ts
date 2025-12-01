// server/src/routes/mnemosyne.ts
import { Router } from 'express';
import { mnemosyneService } from '../mnemosyne/MnemosyneService';
import { FalseMemoryPayload } from '../mnemosyne/mnemosyne.types';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Project MNEMOSYNE
 *   description: API for Memory Implant Fabrication.
 */

/**
 * @swagger
 * /api/mnemosyne/fabricate:
 *   post:
 *     summary: Create and deploy a new false memory fabrication job
 *     tags: [Project MNEMOSYNE]
 *     description: Initiates a 21-day (simulated) process to implant a false memory in a target.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FalseMemoryPayload'
 *     responses:
 *       202:
 *         description: Job accepted and is now active. Returns the job object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemoryFabricationJob'
 *       400:
 *         description: Invalid payload data provided.
 */
router.post('/fabricate', async (req, res, next) => {
  try {
    const payload: FalseMemoryPayload = req.body;
    if (!payload.targetId || !payload.narrative || !payload.deliveryVector) {
      return res.status(400).json({ message: 'Missing required payload fields for memory fabrication.' });
    }
    const job = await mnemosyneService.fabricateAndDeploy(payload);
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/mnemosyne/job/{jobId}:
 *   get:
 *     summary: Get the status and report of a memory fabrication job
 *     tags: [Project MNEMOSYNE]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the memory fabrication job.
 *     responses:
 *       200:
 *         description: The job object, which may be in-progress or complete.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemoryFabricationJob'
 *       404:
 *         description: Job not found.
 */
router.get('/job/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await mnemosyneService.getJobStatus(jobId);
    if (job) {
      res.json(job);
    } else {
      res.status(404).json({ message: `Memory fabrication job with ID ${jobId} not found.` });
    }
  } catch (error) {
    next(error);
  }
});

export const mnemosyneRouter = router;
