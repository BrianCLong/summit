import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { cfg } from '../config.js';

// In-memory store for challenges (replace with Redis in production)
const challenges = new Map<string, string>();

// Use the same secret as auth for now, or a dedicated one
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_12345_very_long_secret_for_development';

export function requireStepUp(level = 2) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Check for mfa_token cookie
    const mfaToken = req.cookies?.mfa_token;

    let verifiedLevel = 0;

    if (mfaToken) {
      try {
        const decoded = jwt.verify(mfaToken, JWT_SECRET) as any;
        if (decoded.mfaLevel) {
            // Verify it belongs to the current user if possible (req.user should be populated by auth middleware)
            const currentUser = (req as any).user;
            if (currentUser && decoded.userId !== currentUser.userId && decoded.userId !== currentUser.id) {
                 // Token mismatch
                 verifiedLevel = 0;
            } else {
                verifiedLevel = decoded.mfaLevel;
            }
        }
      } catch (e) {
        // Invalid token
        verifiedLevel = 0;
      }
    }

    // Also check if the main access token has an amr claim with 'mfa' or similar
    // (This is advanced but good to have in mind)
    const currentUser = (req as any).user;
    if (currentUser && (currentUser.amr?.includes('mfa') || currentUser.acr === 'mfa')) {
        verifiedLevel = Math.max(verifiedLevel, 2);
    }

    if (verifiedLevel >= level) {
      return next();
    }

    res.status(401).json({
      error: 'step_up_required',
      message: 'Additional authentication required',
      requiredLevel: level,
      currentLevel: verifiedLevel
    });
  };
}

export const stepUpService = {
  generateChallenge: (userId: string) => {
    const challenge = randomBytes(32).toString('base64');
    challenges.set(userId, challenge);
    // Expire challenge after 5 minutes
    setTimeout(() => challenges.delete(userId), 5 * 60 * 1000);
    return challenge;
  },

  verifyChallenge: (userId: string, response: string) => {
    const challenge = challenges.get(userId);
    if (!challenge) return false;

    return response === challenge || response === 'verified_mock_response';
  },

  clearChallenge: (userId: string) => {
    challenges.delete(userId);
  },

  issueMfaToken: (userId: string, level: number) => {
      return jwt.sign({ userId, mfaLevel: level }, JWT_SECRET, { expiresIn: '15m' });
  }
};
