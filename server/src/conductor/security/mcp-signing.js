"use strict";
// @ts-nocheck
// MCP Request Signing & Verification
// Provides cryptographic integrity for Model Context Protocol communications
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPSigningConfigs = exports.SignedMCPClient = exports.MCPRequestSigner = void 0;
exports.mcpSignatureVerificationMiddleware = mcpSignatureVerificationMiddleware;
exports.createSignedMCPClient = createSignedMCPClient;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
class MCPRequestSigner {
    privateKey;
    publicKey;
    config;
    constructor(config) {
        this.config = config;
        try {
            this.privateKey = (0, fs_1.readFileSync)(config.privateKeyPath, 'utf8');
            this.publicKey = (0, fs_1.readFileSync)(config.publicKeyPath, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to load signing keys: ${error.message}`);
        }
    }
    /**
     * Sign MCP request with cryptographic signature
     */
    signRequest(request) {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
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
    verifyRequest(signedRequest) {
        const now = Math.floor(Date.now() / 1000);
        // Check timestamp tolerance
        if (Math.abs(now - signedRequest.timestamp) > this.config.timestampTolerance) {
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
    hashRequest(request) {
        const canonical = this.createCanonicalRequest(request);
        return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
    }
    createCanonicalRequest(request) {
        // Create deterministic canonical representation
        const canonicalParams = JSON.stringify(request.params, Object.keys(request.params).sort());
        return [
            request.id,
            request.method,
            canonicalParams,
            request.timestamp.toString(),
            request.nonce,
        ].join('\n');
    }
    createSignature(data) {
        const algorithm = this.getSigningAlgorithm();
        const sign = (0, crypto_1.createSign)(algorithm);
        sign.update(data, 'utf8');
        return sign.sign(this.privateKey, 'base64');
    }
    verifySignature(data, signature) {
        try {
            const algorithm = this.getSigningAlgorithm();
            const verify = (0, crypto_1.createVerify)(algorithm);
            verify.update(data, 'utf8');
            return verify.verify(this.publicKey, signature, 'base64');
        }
        catch {
            return false;
        }
    }
    getSigningAlgorithm() {
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
exports.MCPRequestSigner = MCPRequestSigner;
/**
 * MCP Request Interceptor with Signing
 */
class SignedMCPClient {
    signer;
    requestHistory = new Map();
    constructor(config) {
        this.signer = new MCPRequestSigner(config);
    }
    /**
     * Send signed MCP request
     */
    async sendSignedRequest(url, request) {
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
            throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Verify incoming MCP request (for server-side)
     */
    verifyIncomingRequest(request, headers) {
        const signedRequest = {
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
    cleanRequestHistory() {
        const cutoff = Math.floor(Date.now() / 1000) -
            this.signer.config.timestampTolerance * 2;
        for (const [id, data] of this.requestHistory.entries()) {
            if (data.timestamp < cutoff) {
                this.requestHistory.delete(id);
            }
        }
    }
}
exports.SignedMCPClient = SignedMCPClient;
/**
 * Express middleware for MCP signature verification
 */
function mcpSignatureVerificationMiddleware(signer) {
    return (req, res, next) => {
        // Skip verification for non-MCP requests
        if (!req.path.includes('/jsonrpc') && !req.path.includes('/mcp')) {
            return next();
        }
        const client = new SignedMCPClient(signer.config);
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
exports.MCPSigningConfigs = {
    GRAPHOPS: {
        privateKeyPath: process.env.MCP_GRAPHOPS_PRIVATE_KEY || './keys/mcp-graphops.key',
        publicKeyPath: process.env.MCP_GRAPHOPS_PUBLIC_KEY || './keys/mcp-graphops.pub',
        keyId: 'mcp-graphops-v1',
        algorithm: 'RS256',
        timestampTolerance: 300, // 5 minutes
    },
    FILES: {
        privateKeyPath: process.env.MCP_FILES_PRIVATE_KEY || './keys/mcp-files.key',
        publicKeyPath: process.env.MCP_FILES_PUBLIC_KEY || './keys/mcp-files.pub',
        keyId: 'mcp-files-v1',
        algorithm: 'RS256',
        timestampTolerance: 300, // 5 minutes
    },
};
// Utility function to create signed clients
function createSignedMCPClient(service) {
    const config = exports.MCPSigningConfigs[service];
    return new SignedMCPClient(config);
}
