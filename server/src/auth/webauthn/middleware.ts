// Mock WebAuthn middleware
import { Request, Response, NextFunction } from 'express';
import { cfg } from '../../config.js'; // Assuming config exists

export const requireStepUp = (req: Request, res: Response, next: NextFunction) => {
    // In production, check for MFA/Step-Up token
    const stepUpHeader = req.headers['x-step-up-auth'];

    // In dev, we might be lenient, but for "Guardrails on by default" we should be strict
    // unless explicitly disabled.
    if (!stepUpHeader) {
        if (process.env.NODE_ENV === 'development' && process.env.SKIP_MFA === 'true') {
            console.warn('Skipping Step-Up Auth in Development');
            return next();
        }

        return res.status(401).json({
            error: 'Step-up authentication required',
            required: ['WebAuthn'],
            message: 'Please provide x-step-up-auth header with valid token'
        });
    }

    next();
};
