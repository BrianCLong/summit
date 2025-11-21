import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware for plugin gateway
 */
export class AuthMiddleware {
  private static jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  /**
   * Main authentication middleware
   */
  static middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          // Allow public endpoints
          return next();
        }

        const decoded = await this.verifyToken(token);
        (req as any).user = decoded;

        next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({ error: 'Token expired' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: 'Invalid token' });
        }
        next(error);
      }
    };
  }

  /**
   * Require authentication middleware
   */
  static requireAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!(req as any).user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      next();
    };
  }

  /**
   * Require admin role middleware
   */
  static requireAdmin() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user || !user.roles?.includes('admin')) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    };
  }

  /**
   * Require specific permission middleware
   */
  static requirePermission(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user || !user.permissions?.includes(permission)) {
        return res.status(403).json({ error: `Permission '${permission}' required` });
      }
      next();
    };
  }

  /**
   * Plugin-specific authentication
   */
  static forPlugin(pluginId: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user has access to plugin
      const hasAccess = await this.checkPluginAccess(user, pluginId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access to plugin denied' });
      }

      next();
    };
  }

  /**
   * Extract token from request
   */
  private static extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Also check cookie
    if (req.cookies?.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private static async verifyToken(token: string): Promise<TokenPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as TokenPayload);
        }
      });
    });
  }

  /**
   * Check if user has access to a specific plugin
   */
  private static async checkPluginAccess(user: TokenPayload, pluginId: string): Promise<boolean> {
    // Admin has access to all plugins
    if (user.roles?.includes('admin')) {
      return true;
    }

    // Check user's plugin permissions
    if (user.plugins?.includes(pluginId)) {
      return true;
    }

    return false;
  }

  /**
   * Generate token (for testing)
   */
  static generateToken(payload: Partial<TokenPayload>, expiresIn = '24h'): string {
    return jwt.sign(
      {
        id: payload.id || 'user-1',
        email: payload.email || 'user@example.com',
        roles: payload.roles || ['user'],
        permissions: payload.permissions || [],
        plugins: payload.plugins || [],
      },
      this.jwtSecret,
      { expiresIn }
    );
  }
}

interface TokenPayload {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  plugins: string[];
  iat?: number;
  exp?: number;
}
