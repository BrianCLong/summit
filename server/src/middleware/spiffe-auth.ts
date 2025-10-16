import { Request, Response, NextFunction } from 'express';
import { createConnection } from 'node:net';
import { promisify } from 'node:util';
import { z } from 'zod';
import { otelService } from './observability/otel-tracing.js';

// SPIFFE/SPIRE integration for Zero-Trust mTLS
interface SpiffeId {
  trustDomain: string;
  path: string;
  full: string;
}

interface SpiffeSVID {
  spiffeId: SpiffeId;
  certificate: string;
  privateKey: string;
  bundle: string;
  expiresAt: Date;
}

interface SpiffeContext {
  verified: boolean;
  spiffeId?: SpiffeId;
  svid?: SpiffeSVID;
  peerSpiffeId?: SpiffeId;
}

const SpiffeConfigSchema = z.object({
  trustDomain: z.string().default('intelgraph.local'),
  socketPath: z.string().default('/run/spire/sockets/agent.sock'),
  enabled: z.boolean().default(true),
  requireVerification: z.boolean().default(true),
  allowedTrustDomains: z.array(z.string()).default([]),
});

export class SpiffeAuthService {
  private config: z.infer<typeof SpiffeConfigSchema>;
  private agentSocket: string;
  private localSVID: SpiffeSVID | null = null;
  private svidRefreshTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<z.infer<typeof SpiffeConfigSchema>>) {
    this.config = SpiffeConfigSchema.parse({
      ...config,
      trustDomain: process.env.SPIRE_TRUST_DOMAIN || config?.trustDomain,
      socketPath:
        process.env.SPIFFE_ENDPOINT_SOCKET?.replace('unix://', '') ||
        config?.socketPath,
      enabled: process.env.ZERO_TRUST_ENABLED === 'true',
    });

    this.agentSocket = this.config.socketPath;

    if (this.config.enabled) {
      this.initializeSpiffeAuth();
    }
  }

  private async initializeSpiffeAuth() {
    try {
      // Fetch initial SVID
      await this.fetchSVID();

      // Start SVID refresh timer (refresh at 50% of lifetime)
      this.startSVIDRefresh();

      console.log('SPIFFE authentication initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SPIFFE authentication:', error);

      if (this.config.requireVerification) {
        throw new Error(
          'SPIFFE authentication required but initialization failed',
        );
      }
    }
  }

  /**
   * Express middleware for SPIFFE-based authentication
   */
  middleware() {
    return async (
      req: Request & { spiffe?: SpiffeContext },
      res: Response,
      next: NextFunction,
    ) => {
      const span = otelService.createSpan('spiffe-auth.verify');

      try {
        if (!this.config.enabled) {
          req.spiffe = { verified: false };
          return next();
        }

        // Extract SPIFFE ID from mTLS certificate
        const spiffeId = await this.extractSpiffeIdFromRequest(req);

        if (!spiffeId) {
          if (this.config.requireVerification) {
            span.setStatus({
              code: 2,
              message: 'No SPIFFE ID found in request',
            });
            return res.status(401).json({
              error: 'Unauthorized',
              message: 'Valid SPIFFE ID required',
            });
          }

          req.spiffe = { verified: false };
          return next();
        }

        // Verify SPIFFE ID is from allowed trust domain
        const trustDomainAllowed = this.isTrustDomainAllowed(
          spiffeId.trustDomain,
        );
        if (!trustDomainAllowed) {
          span.setStatus({ code: 2, message: 'Untrusted SPIFFE trust domain' });
          return res.status(403).json({
            error: 'Forbidden',
            message: `Trust domain '${spiffeId.trustDomain}' not allowed`,
          });
        }

        // Set SPIFFE context
        req.spiffe = {
          verified: true,
          spiffeId,
          peerSpiffeId: spiffeId,
        };

        otelService.addSpanAttributes({
          'spiffe.verified': true,
          'spiffe.trust_domain': spiffeId.trustDomain,
          'spiffe.path': spiffeId.path,
        });

        next();
      } catch (error: any) {
        console.error('SPIFFE authentication failed:', error);
        otelService.recordException(error);
        span.setStatus({ code: 2, message: error.message });

        if (this.config.requireVerification) {
          return res.status(500).json({
            error: 'Authentication error',
            message: 'SPIFFE verification failed',
          });
        }

        req.spiffe = { verified: false };
        next();
      } finally {
        span?.end();
      }
    };
  }

  /**
   * Fetch SVID from SPIRE Agent
   */
  private async fetchSVID(): Promise<SpiffeSVID> {
    try {
      // Connect to SPIRE Agent via Unix socket
      const socket = createConnection(this.agentSocket);
      const socketConnected = promisify(socket.connect.bind(socket));
      await socketConnected();

      // Request SVID (simplified - in production use SPIRE API)
      const request = {
        method: 'fetchX509SVID',
        params: {
          audience: [`spiffe://${this.config.trustDomain}/conductor`],
        },
      };

      socket.write(JSON.stringify(request));

      // Read response (simplified)
      const response = await this.readSocketResponse(socket);
      socket.end();

      const svid = this.parseSVIDResponse(response);
      this.localSVID = svid;

      return svid;
    } catch (error) {
      console.error('Failed to fetch SVID:', error);
      throw new Error('SVID fetch failed');
    }
  }

  private async readSocketResponse(socket: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';

      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      socket.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid JSON response from SPIRE Agent'));
        }
      });

      socket.on('error', (error: Error) => {
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('SPIRE Agent response timeout'));
      }, 5000);
    });
  }

  private parseSVIDResponse(response: any): SpiffeSVID {
    // Parse SPIRE Agent response (simplified)
    if (!response.result || !response.result.svids) {
      throw new Error('Invalid SVID response format');
    }

    const svid = response.result.svids[0];
    const spiffeIdParts = this.parseSpiffeId(svid.spiffe_id);

    return {
      spiffeId: spiffeIdParts,
      certificate: svid.x509_svid,
      privateKey: svid.x509_svid_key,
      bundle: svid.bundle,
      expiresAt: new Date(svid.expires_at * 1000),
    };
  }

  private parseSpiffeId(spiffeIdString: string): SpiffeId {
    // Parse SPIFFE ID: spiffe://trust-domain/path
    const match = spiffeIdString.match(/^spiffe:\/\/([^\/]+)(.*)$/);
    if (!match) {
      throw new Error(`Invalid SPIFFE ID format: ${spiffeIdString}`);
    }

    return {
      trustDomain: match[1],
      path: match[2],
      full: spiffeIdString,
    };
  }

  private async extractSpiffeIdFromRequest(
    req: Request,
  ): Promise<SpiffeId | null> {
    // Extract SPIFFE ID from mTLS client certificate
    const clientCert = (req as any).connection?.getPeerCertificate?.();

    if (!clientCert || !clientCert.subject) {
      return null;
    }

    // Look for SPIFFE ID in certificate SAN (Subject Alternative Names)
    if (clientCert.subjectaltname) {
      const sanEntries = clientCert.subjectaltname.split(', ');

      for (const entry of sanEntries) {
        if (entry.startsWith('URI:spiffe://')) {
          const spiffeId = entry.substring(4); // Remove 'URI:' prefix
          return this.parseSpiffeId(spiffeId);
        }
      }
    }

    // Fallback: check X-Spiffe-Id header (for testing/development)
    const headerSpiffeId = req.headers['x-spiffe-id'] as string;
    if (headerSpiffeId && headerSpiffeId.startsWith('spiffe://')) {
      return this.parseSpiffeId(headerSpiffeId);
    }

    return null;
  }

  private isTrustDomainAllowed(trustDomain: string): boolean {
    // Always allow our own trust domain
    if (trustDomain === this.config.trustDomain) {
      return true;
    }

    // Check allowed trust domains list
    if (this.config.allowedTrustDomains.length === 0) {
      return true; // If no restrictions, allow all
    }

    return this.config.allowedTrustDomains.includes(trustDomain);
  }

  private startSVIDRefresh() {
    if (!this.localSVID) return;

    // Calculate refresh time (50% of SVID lifetime)
    const now = new Date().getTime();
    const expiresAt = this.localSVID.expiresAt.getTime();
    const lifetime = expiresAt - now;
    const refreshIn = Math.max(lifetime * 0.5, 60000); // Minimum 1 minute

    this.svidRefreshTimer = setTimeout(async () => {
      try {
        await this.fetchSVID();
        console.log('SVID refreshed successfully');
        this.startSVIDRefresh(); // Schedule next refresh
      } catch (error) {
        console.error('SVID refresh failed:', error);
        // Retry in 1 minute
        this.svidRefreshTimer = setTimeout(
          () => this.startSVIDRefresh(),
          60000,
        );
      }
    }, refreshIn);
  }

  /**
   * Get current local SVID
   */
  getLocalSVID(): SpiffeSVID | null {
    return this.localSVID;
  }

  /**
   * Create authenticated HTTP client for service-to-service calls
   */
  createAuthenticatedClient(): any {
    if (!this.config.enabled || !this.localSVID) {
      // Return regular HTTP client if SPIFFE not enabled
      return {
        get: fetch,
        post: fetch,
        put: fetch,
        delete: fetch,
      };
    }

    // Return mTLS-enabled HTTP client
    const https = require('https');
    const agent = new https.Agent({
      cert: this.localSVID.certificate,
      key: this.localSVID.privateKey,
      ca: this.localSVID.bundle,
      requestCert: true,
      rejectUnauthorized: true,
    });

    return {
      agent,
      get: (url: string, options: any = {}) =>
        fetch(url, { ...options, agent }),
      post: (url: string, options: any = {}) =>
        fetch(url, { ...options, agent, method: 'POST' }),
      put: (url: string, options: any = {}) =>
        fetch(url, { ...options, agent, method: 'PUT' }),
      delete: (url: string, options: any = {}) =>
        fetch(url, { ...options, agent, method: 'DELETE' }),
    };
  }

  /**
   * Verify SPIFFE peer identity for specific operations
   */
  requireSpiffeId(requiredPath: string | RegExp) {
    return (
      req: Request & { spiffe?: SpiffeContext },
      res: Response,
      next: NextFunction,
    ) => {
      if (!this.config.enabled) {
        return next();
      }

      if (!req.spiffe?.verified || !req.spiffe?.spiffeId) {
        return res.status(401).json({
          error: 'SPIFFE authentication required',
          message: 'Valid SPIFFE ID required for this operation',
        });
      }

      const spiffePath = req.spiffe.spiffeId.path;
      let pathMatches = false;

      if (typeof requiredPath === 'string') {
        pathMatches = spiffePath === requiredPath;
      } else {
        pathMatches = requiredPath.test(spiffePath);
      }

      if (!pathMatches) {
        return res.status(403).json({
          error: 'Insufficient SPIFFE authorization',
          message: `Required SPIFFE path not met: ${requiredPath}`,
          yourSpiffeId: req.spiffe.spiffeId.full,
        });
      }

      next();
    };
  }

  /**
   * Health check for SPIFFE service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    spiffeEnabled: boolean;
    svidValid: boolean;
    agentConnected: boolean;
    trustDomain: string;
    expiresIn?: number;
  }> {
    if (!this.config.enabled) {
      return {
        status: 'healthy',
        spiffeEnabled: false,
        svidValid: false,
        agentConnected: false,
        trustDomain: this.config.trustDomain,
      };
    }

    let agentConnected = false;
    let svidValid = false;
    let expiresIn: number | undefined;

    // Check agent connection
    try {
      const socket = createConnection(this.agentSocket);
      const socketConnected = promisify(socket.connect.bind(socket));
      await socketConnected();
      socket.end();
      agentConnected = true;
    } catch (error) {
      console.error('SPIRE Agent connection failed:', error);
    }

    // Check SVID validity
    if (this.localSVID) {
      const now = new Date().getTime();
      const expiresAt = this.localSVID.expiresAt.getTime();

      svidValid = expiresAt > now;
      expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000));
    }

    const status = agentConnected && svidValid ? 'healthy' : 'unhealthy';

    return {
      status,
      spiffeEnabled: this.config.enabled,
      svidValid,
      agentConnected,
      trustDomain: this.config.trustDomain,
      expiresIn,
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.svidRefreshTimer) {
      clearTimeout(this.svidRefreshTimer);
      this.svidRefreshTimer = null;
    }
  }
}

// Create singleton instance
export const spiffeAuth = new SpiffeAuthService();

// Export middleware function
export const spiffeAuthMiddleware = spiffeAuth.middleware();

// Export SPIFFE ID requirement middleware
export const requireSpiffeId = spiffeAuth.requireSpiffeId.bind(spiffeAuth);

// Export authenticated client factory
export const createAuthenticatedClient =
  spiffeAuth.createAuthenticatedClient.bind(spiffeAuth);

// Export health check
export const spiffeHealthCheck = spiffeAuth.healthCheck.bind(spiffeAuth);
