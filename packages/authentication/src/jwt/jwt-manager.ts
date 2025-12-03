/**
 * JWT Token Manager
 *
 * Handles JWT token generation, validation, and lifecycle management
 */

import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jwt-manager');

export interface JWTConfig {
  secret: string;
  publicKey?: string;
  privateKey?: string;
  algorithm?: jwt.Algorithm;
  issuer?: string;
  audience?: string;
  expiresIn?: string | number;
  refreshExpiresIn?: string | number;
}

export interface TokenPayload {
  sub: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
  metadata?: Record<string, any>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTManager {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = {
      algorithm: 'HS256',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
      ...config,
    };
  }

  generateTokenPair(payload: TokenPayload): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const expiresIn = decoded.exp! - Math.floor(Date.now() / 1000);

    logger.info('Token pair generated', { sub: payload.sub });

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  generateAccessToken(payload: TokenPayload): string {
    const signOptions: jwt.SignOptions = {
      algorithm: this.config.algorithm,
      expiresIn: this.config.expiresIn,
    };

    if (this.config.issuer) {
      signOptions.issuer = this.config.issuer;
    }

    if (this.config.audience) {
      signOptions.audience = this.config.audience;
    }

    const secret = this.config.privateKey || this.config.secret;

    return jwt.sign(payload, secret, signOptions);
  }

  generateRefreshToken(payload: TokenPayload): string {
    const refreshPayload = {
      sub: payload.sub,
      type: 'refresh',
    };

    return jwt.sign(refreshPayload, this.config.secret, {
      expiresIn: this.config.refreshExpiresIn,
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const secret = this.config.publicKey || this.config.secret;

      const decoded = jwt.verify(token, secret, {
        algorithms: [this.config.algorithm!],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      logger.error('Token verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Invalid token');
    }
  }

  verifyRefreshToken(token: string): { sub: string } {
    try {
      const decoded = jwt.verify(token, this.config.secret) as { sub: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return { sub: decoded.sub };
    } catch (error) {
      logger.error('Refresh token verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Invalid refresh token');
    }
  }

  refreshAccessToken(refreshToken: string, payload: TokenPayload): TokenPair {
    // Verify refresh token
    this.verifyRefreshToken(refreshToken);

    // Generate new token pair
    return this.generateTokenPair(payload);
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || typeof decoded !== 'object' || !('exp' in decoded)) {
      return true;
    }

    const exp = (decoded as jwt.JwtPayload).exp;
    if (!exp) {
      return true;
    }

    return Date.now() >= exp * 1000;
  }
}
