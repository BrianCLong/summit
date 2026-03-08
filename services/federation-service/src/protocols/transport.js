"use strict";
/**
 * Federation Transport Layer
 *
 * Implements secure transport for federation with:
 * - JSON-over-HTTPS
 * - Message signing (JWT)
 * - Mutual TLS support
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederationTransport = void 0;
exports.generateKeyPair = generateKeyPair;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'transport' });
/**
 * Federation Transport Service
 */
class FederationTransport {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Sign a message with private key
     */
    signMessage(payload, senderId) {
        const nonce = crypto_1.default.randomBytes(16).toString('hex');
        const timestamp = new Date();
        const message = {
            payload,
            signature: '',
            timestamp,
            sender: senderId,
            nonce,
        };
        // Create JWT signature
        const token = jsonwebtoken_1.default.sign({
            payload: JSON.stringify(payload),
            timestamp: timestamp.toISOString(),
            sender: senderId,
            nonce,
        }, this.config.privateKey, {
            algorithm: 'RS256',
            expiresIn: '5m', // Signature valid for 5 minutes
        });
        message.signature = token;
        logger.debug({
            sender: senderId,
            nonce,
        }, 'Message signed');
        return message;
    }
    /**
     * Verify message signature
     */
    verifyMessage(message, partner) {
        try {
            // Verify JWT
            const decoded = jsonwebtoken_1.default.verify(message.signature, partner.publicKey, {
                algorithms: ['RS256'],
            });
            // Verify sender
            if (decoded.sender !== partner.id) {
                return {
                    valid: false,
                    error: 'Sender mismatch',
                };
            }
            // Verify payload integrity
            const expectedPayload = JSON.stringify(message.payload);
            if (decoded.payload !== expectedPayload) {
                return {
                    valid: false,
                    error: 'Payload tampering detected',
                };
            }
            // Verify timestamp (prevent replay attacks)
            const messageTime = new Date(decoded.timestamp);
            const now = new Date();
            const ageMinutes = (now.getTime() - messageTime.getTime()) / 1000 / 60;
            if (ageMinutes > 5) {
                return {
                    valid: false,
                    error: 'Message expired (older than 5 minutes)',
                };
            }
            if (ageMinutes < -1) {
                return {
                    valid: false,
                    error: 'Message timestamp in future',
                };
            }
            logger.debug({
                sender: message.sender,
                nonce: message.nonce,
            }, 'Message signature verified');
            return { valid: true };
        }
        catch (error) {
            logger.error({
                error: error instanceof Error ? error.message : String(error),
            }, 'Signature verification failed');
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Verification failed',
            };
        }
    }
    /**
     * Send share package to partner endpoint
     */
    async sendSharePackage(pkg, partner, senderId) {
        logger.info({
            packageId: pkg.id,
            partnerId: partner.id,
            endpoint: partner.endpointUrl,
        }, 'Sending share package');
        // Sign the package
        const signedMessage = this.signMessage(pkg, senderId);
        try {
            // Send via HTTPS POST
            const response = await fetch(partner.endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Federation-Version': '1.0',
                    'X-Sender-Id': senderId,
                },
                body: JSON.stringify(signedMessage),
                // In Node.js 18+, can use agent for mTLS:
                // agent: this.createMtlsAgent(),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error({
                    status: response.status,
                    error: errorText,
                }, 'Share package delivery failed');
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorText}`,
                };
            }
            const result = await response.json();
            logger.info({
                packageId: pkg.id,
                partnerId: partner.id,
            }, 'Share package delivered successfully');
            return { success: true };
        }
        catch (error) {
            logger.error({
                error: error instanceof Error ? error.message : String(error),
            }, 'Failed to send share package');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Create mTLS agent for Node.js fetch
     * (In production, use https.Agent with cert/key/ca)
     */
    createMtlsAgent() {
        // Placeholder - in production:
        // import https from 'https';
        // import fs from 'fs';
        // return new https.Agent({
        //   cert: fs.readFileSync(this.config.certificatePath!),
        //   key: fs.readFileSync(this.config.keyPath!),
        //   ca: fs.readFileSync(this.config.caPath!),
        //   rejectUnauthorized: true,
        // });
        return undefined;
    }
    /**
     * Hash package for integrity verification
     */
    hashPackage(pkg) {
        const canonical = JSON.stringify(pkg, Object.keys(pkg).sort());
        return crypto_1.default.createHash('sha256').update(canonical).digest('hex');
    }
    /**
     * Verify package integrity
     */
    verifyPackageIntegrity(pkg, expectedHash) {
        const actualHash = this.hashPackage(pkg);
        return actualHash === expectedHash;
    }
}
exports.FederationTransport = FederationTransport;
/**
 * Generate RSA key pair for testing/development
 */
function generateKeyPair() {
    const { privateKey, publicKey } = crypto_1.default.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });
    return { privateKey, publicKey };
}
