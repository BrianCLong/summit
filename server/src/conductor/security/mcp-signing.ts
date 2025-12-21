// MCP Request Signing & Verification
// Provides cryptographic integrity for Model Context Protocol communications

import { createSign, createVerify, createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

export interface SignedMCPRequest {
  id: string;
  method: string;
  params: any;
  timestamp: number;
  nonce: string;
  signature: string;
  publicKeyId: string;
}

export interface MCPSigningConfig {
  privateKeyPath: string;
  publicKeyPath: string;
  keyId: string;
  algorithm: 'RS256' | 'RS512' | 'ES256' | 'ES512';
  timestampTolerance: number; // seconds
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  timestamp: number;
  publicKeyId: string;
}

export class MCPRequestSigner {
  private privateKey: string;
  private publicKey: string;
  private config: MCPSigningConfig;

  constructor(config: MCPSigningConfig) {
    this.config = config;

    try {
      this.privateKey = readFileSync(config.privateKeyPath, 'utf8');
      this.publicKey = readFileSync(config.publicKeyPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load signing keys: ${error.message}`);
    }
  }

  /**
   * Sign MCP request with cryptographic signature
   */
  signRequest(request: {
    id: string;
    method: string;
    params: any;
  }): SignedMCPRequest {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');

    // Create canonical request string for signing
    const canonicalRequest = this.createCanonicalRequest({
      ...request,
      timestamp,
      nonce,
    });

    // Create signature
    const signature = this.createSignature(canonicalRequest);

    return {
      ...request,
      timestamp,
      nonce,
      signature,
      publicKeyId: this.config.keyId,
    };
  }

  /**
   * Verify signed MCP request
   */
  verifyRequest(signedRequest: SignedMCPRequest): VerificationResult {
    const now = Math.floor(Date.now() / 1000);

    // Check timestamp tolerance
    if (
      Math.abs(now - signedRequest.timestamp) > this.config.timestampTolerance
    ) {
      return {
        valid: false,
        reason: 'Request timestamp outside tolerance window',
        timestamp: now,
        publicKeyId: signedRequest.publicKeyId,
      };
    }

    // Check key ID
    if (signedRequest.publicKeyId !== this.config.keyId) {
      return {
        valid: false,
        reason: 'Unknown public key ID',
        timestamp: now,
        publicKeyId: signedRequest.publicKeyId,
      };
    }

    // Recreate canonical request
    const canonicalRequest = this.createCanonicalRequest({
      id: signedRequest.id,
      method: signedRequest.method,
      params: signedRequest.params,
      timestamp: signedRequest.timestamp,
      nonce: signedRequest.nonce,
    });

    // Verify signature
    if (!this.verifySignature(canonicalRequest, signedRequest.signature)) {
      return {
        valid: false,
        reason: 'Invalid signature',
        timestamp: now,
        publicKeyId: signedRequest.publicKeyId,
      };
    }

    return {
      valid: true,
      timestamp: now,
      publicKeyId: signedRequest.publicKeyId,
    };
  }

  /**
   * Create hash of request for integrity checking
   */
  hashRequest(request: any): string {
    const canonical = this.createCanonicalRequest(request);
    return createHash('sha256').update(canonical).digest('hex');
  }

  private createCanonicalRequest(request: {
    id: string;
    method: string;
    params: any;
    timestamp: number;
    nonce: string;
  }): string {
    // Create deterministic canonical representation
    const canonicalParams = JSON.stringify(
      request.params,
      Object.keys(request.params).sort(),
    );

    return [
      request.id,
      request.method,
      canonicalParams,
      request.timestamp.toString(),
      request.nonce,
    ].join('\n');
  }

  private createSignature(data: string): string {
    const algorithm = this.getSigningAlgorithm();
    const sign = createSign(algorithm);
    sign.update(data, 'utf8');
    return sign.sign(this.privateKey, 'base64');
  }

  private verifySignature(data: string, signature: string): boolean {
    try {
      const algorithm = this.getSigningAlgorithm();
      const verify = createVerify(algorithm);
      verify.update(data, 'utf8');
      return verify.verify(this.publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  private getSigningAlgorithm(): string {
    switch (this.config.algorithm) {
      case 'RS256':
        return 'RSA-SHA256';
      case 'RS512':
        return 'RSA-SHA512';
      case 'ES256':
        return 'ECDSA-SHA256';
      case 'ES512':
        return 'ECDSA-SHA512';
      default:
        throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
  }
}

/**
 * MCP Request Interceptor with Signing
 */
export class SignedMCPClient {
  private signer: MCPRequestSigner;
  private requestHistory = new Map<
    string,
    { timestamp: number; hash: string }
  >();

  constructor(config: MCPSigningConfig) {
    this.signer = new MCPRequestSigner(config);
  }

  /**
   * Send signed MCP request
   */
  async sendSignedRequest(
    url: string,
    request: { id: string; method: string; params: any },
  ): Promise<any> {
    // Sign the request
    const signedRequest = this.signer.signRequest(request);

    // Store in history for replay detection
    const requestHash = this.signer.hashRequest(signedRequest);
    this.requestHistory.set(signedRequest.id, {
      timestamp: signedRequest.timestamp,
      hash: requestHash,
    });

    // Clean old history entries (prevent memory leak)
    this.cleanRequestHistory();

    // Send HTTP request with signature headers
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Signature': signedRequest.signature,
        'X-MCP-Key-ID': signedRequest.publicKeyId,
        'X-MCP-Timestamp': signedRequest.timestamp.toString(),
        'X-MCP-Nonce': signedRequest.nonce,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: signedRequest.id,
        method: signedRequest.method,
        params: signedRequest.params,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `MCP request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Verify incoming MCP request (for server-side)
   */
  verifyIncomingRequest(
    request: any,
    headers: Record<string, string>,
  ): VerificationResult {
    const signedRequest: SignedMCPRequest = {
      id: request.id,
      method: request.method,
      params: request.params,
      timestamp: parseInt(headers['x-mcp-timestamp'] || '0'),
      nonce: headers['x-mcp-nonce'] || '',
      signature: headers['x-mcp-signature'] || '',
      publicKeyId: headers['x-mcp-key-id'] || '',
    };

    // Check for replay attacks
    const requestHash = this.signer.hashRequest(signedRequest);
    const existingRequest = this.requestHistory.get(signedRequest.id);

    if (existingRequest && existingRequest.hash === requestHash) {
      return {
        valid: false,
        reason: 'Request replay detected',
        timestamp: Date.now(),
        publicKeyId: signedRequest.publicKeyId,
      };
    }

    return this.signer.verifyRequest(signedRequest);
  }

  private cleanRequestHistory(): void {
    const cutoff =
      Math.floor(Date.now() / 1000) -
      (this.signer as any).config.timestampTolerance * 2;

    for (const [id, data] of this.requestHistory.entries()) {
      if (data.timestamp < cutoff) {
        this.requestHistory.delete(id);
      }
    }
  }
}

/**
 * Express middleware for MCP signature verification
 */
export function mcpSignatureVerificationMiddleware(signer: MCPRequestSigner) {
  return (req: any, res: any, next: any) => {
    // Skip verification for non-MCP requests
    if (!req.path.includes('/jsonrpc') && !req.path.includes('/mcp')) {
      return next();
    }

    const client = new SignedMCPClient(signer.config as any);
    const verification = client.verifyIncomingRequest(req.body, req.headers);

    if (!verification.valid) {
      console.warn('MCP signature verification failed:', {
        reason: verification.reason,
        path: req.path,
        timestamp: verification.timestamp,
      });

      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid request signature',
          data: { reason: verification.reason },
        },
        id: req.body?.id || null,
      });
    }

    // Add verification result to request context
    req.mcpVerification = verification;
    next();
  };
}

// Default configurations
export const MCPSigningConfigs = {
  GRAPHOPS: {
    privateKeyPath:
      process.env.MCP_GRAPHOPS_PRIVATE_KEY || './keys/mcp-graphops.key',
    publicKeyPath:
      process.env.MCP_GRAPHOPS_PUBLIC_KEY || './keys/mcp-graphops.pub',
    keyId: 'mcp-graphops-v1',
    algorithm: 'RS256' as const,
    timestampTolerance: 300, // 5 minutes
  },
  FILES: {
    privateKeyPath: process.env.MCP_FILES_PRIVATE_KEY || './keys/mcp-files.key',
    publicKeyPath: process.env.MCP_FILES_PUBLIC_KEY || './keys/mcp-files.pub',
    keyId: 'mcp-files-v1',
    algorithm: 'RS256' as const,
    timestampTolerance: 300, // 5 minutes
  },
};

// Utility function to create signed clients
export function createSignedMCPClient(
  service: 'GRAPHOPS' | 'FILES',
): SignedMCPClient {
  const config = MCPSigningConfigs[service];
  return new SignedMCPClient(config);
}
