// server/src/routes/abyss.ts
import { Router } from 'express';
import { abyssService } from '../abyss/AbyssService';
import { NextFunction, Request, Response } from 'express';

const router = Router();

/**
 * Middleware for extreme authorization.
 * In a real system, this would involve multiple, independent, and cryptographically secure checks.
 * For this simulation, it checks for a specific, hardcoded header.
 */
const extremeAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['x-abyss-authorization'];
    if (authHeader === 'CONFIRM_FINAL_PROTOCOL_ARMING_SEQUENCE_OMEGA') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Unimaginable authorization is required.' });
    }
};

/**
 * @swagger
 * tags:
 *   name: Project ABYSS
 *   description: API for the Final Protocol. Access is highly restricted.
 */

/**
 * @swagger
 * /api/abyss/state:
 *   get:
 *     summary: Get the current state of the Final Protocol
 *     tags: [Project ABYSS]
 *     description: Retrieves the current status of the self-destruction and mirroring protocol. Requires extreme authorization.
 *     security:
 *       - AbyssAuth: []
 *     responses:
 *       200:
 *         description: The current state of the Abyss Protocol.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AbyssProtocolState'
 *       403:
 *         description: Forbidden.
 */
router.get('/state', extremeAuth, async (req, res, next) => {
    try {
        const state = await abyssService.getProtocolState();
        res.json(state);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/abyss/arm:
 *   post:
 *     summary: Arm the Final Protocol
 *     tags: [Project ABYSS]
 *     description: Arms the self-destruction and mirroring protocol. This is the final step before a trigger event can activate it. THIS IS NOT A DRILL.
 *     security:
 *       - AbyssAuth: []
 *     responses:
 *       200:
 *         description: The protocol has been successfully armed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AbyssProtocolState'
 *       403:
 *         description: Forbidden.
 *       409:
 *         description: The protocol is not in a state that can be armed.
 */
router.post('/arm', extremeAuth, async (req, res, next) => {
    try {
        const state = await abyssService.armFinalProtocol();
        res.status(200).json(state);
    } catch (error) {
        // Use a 409 Conflict status if the state is wrong
        res.status(409).json({ message: error.message });
    }
});

export const abyssRouter = router;
