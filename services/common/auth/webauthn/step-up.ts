/**
 * WebAuthn Step-Up Authentication
 * Sprint 27D: Short-lived privilege escalation with audit trail
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface StepUpToken {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  scope: string[];
  audience: string;
  purpose: string;
  signature: string;
}

export interface StepUpChallenge {
  challengeId: string;
  challenge: string;
  userId: string;
  purpose: string;
  createdAt: number;
  expiresAt: number;
}

export class WebAuthnStepUp {
  private static readonly TTL_SECONDS = 300; // 5 minutes
  private static readonly challenges = new Map<string, StepUpChallenge>();
  private static readonly tokens = new Map<string, StepUpToken>();

  /**
   * Generate step-up challenge
   */
  static async generateChallenge(
    userId: string,
    purpose: string,
  ): Promise<StepUpChallenge> {
    const challengeId = crypto.randomUUID();
    const challenge = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();

    const challengeData: StepUpChallenge = {
      challengeId,
      challenge,
      userId,
      purpose,
      createdAt: now,
      expiresAt: now + 60 * 1000, // 1 minute to complete
    };

    this.challenges.set(challengeId, challengeData);

    // Cleanup expired challenges
    this.cleanupExpired();

    return challengeData;
  }

  /**
   * Verify WebAuthn response and issue step-up token
   */
  static async verifyAndIssueToken(
    challengeId: string,
    webauthnResponse: any,
    purpose: string,
  ): Promise<StepUpToken | null> {
    const challenge = this.challenges.get(challengeId);

    if (!challenge) {
      throw new Error('Challenge not found or expired');
    }

    if (challenge.expiresAt < Date.now()) {
      this.challenges.delete(challengeId);
      throw new Error('Challenge expired');
    }

    // In production: verify WebAuthn response against challenge
    // For demo: simplified verification
    const isValid =
      webauthnResponse?.response?.clientDataJSON &&
      webauthnResponse?.response?.authenticatorData;

    if (!isValid) {
      throw new Error('Invalid WebAuthn response');
    }

    // Issue step-up token
    const now = Date.now();
    const token: StepUpToken = {
      userId: challenge.userId,
      issuedAt: now,
      expiresAt: now + this.TTL_SECONDS * 1000,
      scope: this.getScopeForPurpose(purpose),
      audience: 'intelgraph-api',
      purpose,
      signature: this.signToken(challenge.userId, purpose, now),
    };

    const tokenId = crypto.randomUUID();
    this.tokens.set(tokenId, token);

    // Clean up used challenge
    this.challenges.delete(challengeId);

    // Audit log
    console.log(
      JSON.stringify({
        event: 'stepup_token_issued',
        userId: token.userId,
        purpose: token.purpose,
        scope: token.scope,
        expiresAt: new Date(token.expiresAt).toISOString(),
        timestamp: new Date().toISOString(),
      }),
    );

    return token;
  }

  /**
   * Verify step-up token
   */
  static verifyToken(
    tokenId: string,
    requiredPurpose?: string,
  ): StepUpToken | null {
    const token = this.tokens.get(tokenId);

    if (!token) {
      return null;
    }

    if (token.expiresAt < Date.now()) {
      this.tokens.delete(tokenId);
      return null;
    }

    if (requiredPurpose && token.purpose !== requiredPurpose) {
      return null;
    }

    // Verify signature
    const expectedSignature = this.signToken(
      token.userId,
      token.purpose,
      token.issuedAt,
    );
    if (token.signature !== expectedSignature) {
      return null;
    }

    return token;
  }

  /**
   * Revoke step-up token (logout)
   */
  static revokeToken(tokenId: string): boolean {
    return this.tokens.delete(tokenId);
  }

  /**
   * Middleware to require step-up authentication
   */
  static requireStepUp(purpose: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const stepupToken = req.headers['x-stepup-token'] as string;
      const purposeHeader = req.headers['x-purpose'] as string;

      if (!stepupToken) {
        return res.status(401).json({
          error: 'Step-up authentication required',
          purpose: purpose,
          remediation_url: '/auth/stepup/challenge',
        });
      }

      if (!purposeHeader) {
        return res.status(400).json({
          error: 'Purpose header required',
          required_header: 'x-purpose',
        });
      }

      const token = this.verifyToken(stepupToken, purpose);

      if (!token) {
        return res.status(401).json({
          error: 'Invalid or expired step-up token',
          purpose: purpose,
          remediation_url: '/auth/stepup/challenge',
        });
      }

      // Add token info to request
      (req as any).stepUpToken = token;
      (req as any).purpose = purposeHeader;

      // Audit log
      console.log(
        JSON.stringify({
          event: 'stepup_access_granted',
          userId: token.userId,
          purpose: purposeHeader,
          endpoint: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
        }),
      );

      next();
    };
  }

  private static getScopeForPurpose(purpose: string): string[] {
    const scopeMap: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'admin'],
      ops: ['read', 'write', 'export'],
      legal: ['read', 'export', 'pii'],
      compliance: ['read', 'export', 'audit'],
      investigation: ['read', 'write'],
    };

    return scopeMap[purpose] || ['read'];
  }

  private static signToken(
    userId: string,
    purpose: string,
    issuedAt: number,
  ): string {
    const secret =
      process.env.STEPUP_SECRET || 'demo-secret-change-in-production';
    const data = `${userId}:${purpose}:${issuedAt}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  private static cleanupExpired(): void {
    const now = Date.now();

    // Cleanup expired challenges
    for (const [id, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt < now) {
        this.challenges.delete(id);
      }
    }

    // Cleanup expired tokens
    for (const [id, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(id);
      }
    }
  }
}

// Express route handlers
export const stepUpRoutes = {
  /**
   * POST /auth/stepup/challenge
   */
  async challenge(req: Request, res: Response) {
    try {
      const { purpose } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!purpose) {
        return res.status(400).json({ error: 'Purpose required' });
      }

      const challenge = await WebAuthnStepUp.generateChallenge(userId, purpose);

      res.json({
        challengeId: challenge.challengeId,
        challenge: challenge.challenge,
        purpose: challenge.purpose,
        expiresAt: new Date(challenge.expiresAt).toISOString(),
      });
    } catch (error) {
      console.error('StepUp challenge error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * POST /auth/stepup/verify
   */
  async verify(req: Request, res: Response) {
    try {
      const { challengeId, webauthnResponse, purpose } = req.body;

      if (!challengeId || !webauthnResponse || !purpose) {
        return res.status(400).json({
          error: 'challengeId, webauthnResponse, and purpose required',
        });
      }

      const token = await WebAuthnStepUp.verifyAndIssueToken(
        challengeId,
        webauthnResponse,
        purpose,
      );

      if (!token) {
        return res.status(401).json({ error: 'Verification failed' });
      }

      res.json({
        token: crypto.randomUUID(), // Return token ID, not token itself
        expiresAt: new Date(token.expiresAt).toISOString(),
        scope: token.scope,
        purpose: token.purpose,
      });
    } catch (error) {
      console.error('StepUp verification error:', error);
      res.status(401).json({ error: error.message });
    }
  },

  /**
   * POST /auth/stepup/revoke
   */
  async revoke(req: Request, res: Response) {
    try {
      const tokenId = req.headers['x-stepup-token'] as string;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID required' });
      }

      const revoked = WebAuthnStepUp.revokeToken(tokenId);

      res.json({ revoked });
    } catch (error) {
      console.error('StepUp revocation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
