"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.abyssRouter = void 0;
// server/src/routes/abyss.ts
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const AbyssService_js_1 = require("../abyss/AbyssService.js");
const router = (0, express_1.Router)();
/**
 * Middleware for extreme authorization.
 * In a real system, this would involve multiple, independent, and cryptographically secure checks.
 * For this simulation, it checks for a specific, hardcoded header.
 */
const extremeAuth = (req, res, next) => {
    const authHeader = req.headers['x-abyss-authorization'];
    const requiredHeader = process.env.ABYSS_SECURITY_HEADER;
    // Fail secure: If env var is not set, access is denied.
    if (requiredHeader && typeof authHeader === 'string') {
        // SECURITY: Use timingSafeEqual to prevent timing attacks on header verification
        // Ensure both buffers are equal length before comparing to avoid leaking length info
        // (though in this specific case, leaking length of a fixed API key might be acceptable risk,
        // using the hash comparison approach is safer generally but slightly more complex.
        // For simplicity and effectiveness here, we check length first (constant time-ish)
        // then use timingSafeEqual)
        const a = Buffer.from(authHeader);
        const b = Buffer.from(requiredHeader);
        if (a.length === b.length && crypto_1.default.timingSafeEqual(a, b)) {
            return next();
        }
    }
    if (!requiredHeader) {
        console.error('Security Error: ABYSS_SECURITY_HEADER is not configured.');
    }
    res.status(403).json({ message: 'Forbidden: Unimaginable authorization is required.' });
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
        const state = await AbyssService_js_1.abyssService.getProtocolState();
        res.json(state);
    }
    catch (error) {
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
        const state = await AbyssService_js_1.abyssService.armFinalProtocol();
        res.status(200).json(state);
    }
    catch (error) {
        // Use a 409 Conflict status if the state is wrong
        res.status(409).json({ message: error.message });
    }
});
exports.abyssRouter = router;
