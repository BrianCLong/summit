import { createVerify, createHash, randomBytes } from 'crypto';

export interface WebAuthnConfig {
  rpId: string;
  rpName: string;
  origin: string;
  challengeTimeout: number; // seconds
  sessionTimeout: number;
  elevationTimeout: number;
  enableRiskAssessment: boolean;
  allowPlatformAuthenticators: boolean;
  allowCrossPlatformAuthenticators: boolean;
  requireUserVerification: boolean;
  supportedAlgorithms: number[];
  maxCredentialsPerUser: number;
  attestationFormats: string[];
}

export interface StoredCredential {
  id: string;
  userId: string;
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer; // PEM-encoded public key bytes
  algorithm: number;
  counter: number;
  aaguid: ArrayBuffer;
  credentialBackedUp: boolean;
  credentialDeviceType: string;
  transports: string[];
  attestationFormat: string;
  createdAt: Date;
  metadata: { userAgent: string; ipAddress: string };
}

interface StoredChallenge {
  challenge: Buffer;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
}

export interface AuthenticationResult {
  success: boolean;
  errors?: string[];
  userId?: string;
  credentialId?: string;
}

export interface AuthenticationOptions {
  challengeId: string;
  options: {
    challenge: ArrayBuffer;
  };
}

export interface PublicKeyCredentialAssertion {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    authenticatorData: ArrayBuffer;
    signature: ArrayBuffer;
  };
  type: string;
  getClientExtensionResults: () => Record<string, unknown>;
}

export class WebAuthnManager {
  private config: WebAuthnConfig;
  // Map userId -> StoredCredential[]
  credentials: Map<string, StoredCredential[]> = new Map();
  // Map challengeId -> StoredChallenge
  private challenges: Map<string, StoredChallenge> = new Map();

  constructor(config: WebAuthnConfig) {
    this.config = config;
  }

  async initiateAuthentication(params: {
    userId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<AuthenticationOptions> {
    const { userId, ipAddress, userAgent } = params;
    const challenge = randomBytes(32);
    const challengeId = randomBytes(16).toString('hex');

    this.challenges.set(challengeId, {
      challenge,
      userId,
      ipAddress,
      userAgent,
      createdAt: Date.now(),
    });

    return {
      challengeId,
      options: {
        challenge: challenge.buffer.slice(challenge.byteOffset, challenge.byteOffset + challenge.byteLength),
      },
    };
  }

  async completeAuthentication(
    challengeId: string,
    credential: PublicKeyCredentialAssertion,
    context: { ipAddress: string; userAgent: string },
  ): Promise<AuthenticationResult> {
    const errors: string[] = [];

    const storedChallenge = this.challenges.get(challengeId);
    if (!storedChallenge) {
      return { success: false, errors: ['Challenge not found or expired'] };
    }

    // Clean up challenge (one-time use)
    this.challenges.delete(challengeId);

    // Check challenge expiry
    const ageSeconds = (Date.now() - storedChallenge.createdAt) / 1000;
    if (ageSeconds > this.config.challengeTimeout) {
      return { success: false, errors: ['Challenge expired'] };
    }

    const { authenticatorData, clientDataJSON, signature } = credential.response;

    // Parse clientDataJSON
    const clientDataBuffer = Buffer.from(clientDataJSON);
    let clientData: { type: string; challenge: string; origin: string };
    try {
      clientData = JSON.parse(clientDataBuffer.toString('utf8'));
    } catch {
      return { success: false, errors: ['Invalid clientDataJSON'] };
    }

    // Verify type
    if (clientData.type !== 'webauthn.get') {
      errors.push('Invalid clientData type');
    }

    // Verify challenge
    const expectedChallenge = storedChallenge.challenge.toString('base64');
    if (clientData.challenge !== expectedChallenge) {
      errors.push('Challenge mismatch');
    }

    // Verify origin
    if (clientData.origin !== this.config.origin) {
      errors.push('Origin mismatch');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Parse authenticatorData
    const authDataBuffer = Buffer.from(authenticatorData);
    if (authDataBuffer.length < 37) {
      return { success: false, errors: ['Authenticator data too short'] };
    }

    // Verify RP ID hash (first 32 bytes)
    const rpIdHash = createHash('sha256').update(this.config.rpId).digest();
    const authRpIdHash = authDataBuffer.slice(0, 32);
    if (!rpIdHash.equals(authRpIdHash)) {
      return { success: false, errors: ['RP ID hash mismatch'] };
    }

    // Verify flags
    const flags = authDataBuffer[32];
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;

    if (!userPresent) {
      errors.push('User not present');
    }
    if (this.config.requireUserVerification && !userVerified) {
      errors.push('User verification required but not performed');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Find matching credential
    const rawId = Buffer.from(credential.rawId);
    const userCredentials = this.credentials.get(storedChallenge.userId) ?? [];
    const matchedCred = userCredentials.find((c) => {
      const storedId = Buffer.from(c.credentialId);
      return storedId.equals(rawId) || credential.id === c.id;
    });

    if (!matchedCred) {
      return { success: false, errors: ['Credential not found'] };
    }

    // Verify signature
    const clientDataHash = createHash('sha256').update(clientDataBuffer).digest();
    const signatureBase = Buffer.concat([authDataBuffer, clientDataHash]);
    const publicKeyPem = Buffer.from(matchedCred.publicKey).toString('utf8');
    const sigBuffer = Buffer.from(signature);

    const sigValid = this.verifySignature(matchedCred.algorithm, publicKeyPem, signatureBase, sigBuffer);
    if (!sigValid) {
      return { success: false, errors: ['Invalid signature'] };
    }

    // Verify counter (replay protection)
    const counter = authDataBuffer.readUInt32BE(33);
    if (matchedCred.counter > 0 && counter <= matchedCred.counter) {
      return { success: false, errors: ['Counter replay detected'] };
    }

    // Update counter
    matchedCred.counter = counter;

    return {
      success: true,
      userId: matchedCred.userId,
      credentialId: matchedCred.id,
    };
  }

  private verifySignature(algorithm: number, publicKeyPem: string, data: Buffer, signature: Buffer): boolean {
    // Algorithm -7 = ES256 (ECDSA with P-256 and SHA-256)
    // Algorithm -257 = RS256 (RSASSA-PKCS1-v1_5 with SHA-256)
    let hashAlgorithm: string;
    switch (algorithm) {
      case -7:
        hashAlgorithm = 'SHA256';
        break;
      case -257:
        hashAlgorithm = 'SHA256';
        break;
      default:
        return false;
    }

    try {
      const verifier = createVerify(hashAlgorithm);
      verifier.update(data);
      verifier.end();
      return verifier.verify(publicKeyPem, signature);
    } catch {
      return false;
    }
  }
}
