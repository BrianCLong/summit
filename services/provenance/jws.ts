/**
 * JWS Response Token Service for MC Platform v0.3.5
 * Creates Ed25519-signed detached JWS tokens for every agentic response
 */

import * as jose from 'jose';
import { createHash } from 'crypto';
import { generateKeyPair } from 'crypto';
import { promisify } from 'util';

interface ResponsePayload {
  requestId: string;
  tenantId: string;
  timestamp: string;
  inputHash: string;
  outputHash: string;
  provDagId?: string;
  model?: string;
  cost?: number;
}

interface JWSToken {
  token: string;
  payload: ResponsePayload;
  verified: boolean;
}

interface JWKS {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    alg: string;
    crv: string;
    x: string;
    y?: string;
  }>;
}

export class JWSResponseService {
  private privateKey: jose.KeyLike | Uint8Array | null = null;
  private publicKey: jose.KeyLike | null = null;
  private keyId: string;

  constructor(keyId: string = 'mc-v035-ed25519-001') {
    this.keyId = keyId;
  }

  /**
   * Initialize with Ed25519 key pair for signing
   */
  async initialize(): Promise<void> {
    const generateKeyPairAsync = promisify(generateKeyPair);

    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.privateKey = await jose.importPKCS8(privateKey, 'EdDSA');
    this.publicKey = await jose.importSPKI(publicKey, 'EdDSA');

    console.log('✅ JWS service initialized with Ed25519 key pair');
  }

  /**
   * Create hash of input/output for integrity verification
   */
  private createHash(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Sign a response with detached JWS
   */
  async signResponse(
    requestId: string,
    tenantId: string,
    inputData: string,
    outputData: string,
    metadata: {
      provDagId?: string;
      model?: string;
      cost?: number;
    } = {},
  ): Promise<JWSToken> {
    if (!this.privateKey) {
      throw new Error('JWS service not initialized');
    }

    const payload: ResponsePayload = {
      requestId,
      tenantId,
      timestamp: new Date().toISOString(),
      inputHash: this.createHash(inputData),
      outputHash: this.createHash(outputData),
      ...metadata,
    };

    // Create JWS with detached payload
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({
        alg: 'EdDSA',
        typ: 'JWT',
        kid: this.keyId,
      })
      .setIssuedAt()
      .setExpirationTime('24h')
      .setIssuer('mc-platform-v035')
      .setAudience('mc-clients')
      .sign(this.privateKey);

    return {
      token: jwt,
      payload,
      verified: await this.verifyToken(jwt, inputData, outputData),
    };
  }

  /**
   * Verify a JWS token against input/output data
   */
  async verifyToken(
    token: string,
    inputData: string,
    outputData: string,
  ): Promise<boolean> {
    if (!this.publicKey) {
      throw new Error('JWS service not initialized');
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        issuer: 'mc-platform-v035',
        audience: 'mc-clients',
      });

      const claims = payload as ResponsePayload;

      // Verify input/output hashes match
      const expectedInputHash = this.createHash(inputData);
      const expectedOutputHash = this.createHash(outputData);

      return (
        claims.inputHash === expectedInputHash &&
        claims.outputHash === expectedOutputHash
      );
    } catch (error) {
      console.error('JWS verification failed:', error);
      return false;
    }
  }

  /**
   * Generate JWKS for public key distribution
   */
  async generateJWKS(): Promise<JWKS> {
    if (!this.publicKey) {
      throw new Error('JWS service not initialized');
    }

    const jwk = await jose.exportJWK(this.publicKey);

    return {
      keys: [
        {
          kty: jwk.kty!,
          use: 'sig',
          kid: this.keyId,
          alg: 'EdDSA',
          crv: jwk.crv!,
          x: jwk.x!,
        },
      ],
    };
  }

  /**
   * Create a client verifier instance
   */
  static async createVerifier(
    jwks: JWKS,
    keyId: string,
  ): Promise<JWSClientVerifier> {
    return new JWSClientVerifier(jwks, keyId);
  }
}

/**
 * Client-side JWS verifier (PoC)
 */
export class JWSClientVerifier {
  private publicKey: jose.KeyLike | null = null;
  private keyId: string;

  constructor(
    private jwks: JWKS,
    keyId: string,
  ) {
    this.keyId = keyId;
  }

  /**
   * Initialize verifier with public key from JWKS
   */
  async initialize(): Promise<void> {
    const key = this.jwks.keys.find((k) => k.kid === this.keyId);
    if (!key) {
      throw new Error(`Key ${this.keyId} not found in JWKS`);
    }

    this.publicKey = await jose.importJWK(key, 'EdDSA');
    console.log('✅ Client verifier initialized');
  }

  /**
   * Verify response authenticity
   */
  async verifyResponse(
    token: string,
    inputData: string,
    outputData: string,
  ): Promise<{
    valid: boolean;
    payload?: ResponsePayload;
    error?: string;
  }> {
    if (!this.publicKey) {
      return { valid: false, error: 'Verifier not initialized' };
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        issuer: 'mc-platform-v035',
        audience: 'mc-clients',
      });

      const claims = payload as ResponsePayload;

      // Verify hashes
      const inputHash = createHash('sha256')
        .update(inputData, 'utf8')
        .digest('hex');
      const outputHash = createHash('sha256')
        .update(outputData, 'utf8')
        .digest('hex');

      const valid =
        claims.inputHash === inputHash && claims.outputHash === outputHash;

      return {
        valid,
        payload: claims,
        error: valid ? undefined : 'Hash verification failed',
      };
    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Demo function for JWS service
 */
async function demonstrateJWS(): Promise<void> {
  console.log('🔐 MC Platform v0.3.5 - JWS Response Token Demo');
  console.log('='.repeat(60));

  // Initialize JWS service
  const jwsService = new JWSResponseService();
  await jwsService.initialize();

  // Sample data
  const requestId = 'req_' + Date.now();
  const tenantId = 'TENANT_001';
  const inputData = 'What is the status of our security posture?';
  const outputData =
    'Security posture is excellent with 99.97% availability and all privacy gates operational.';

  // Sign response
  console.log('\n📝 Signing response...');
  const signedResponse = await jwsService.signResponse(
    requestId,
    tenantId,
    inputData,
    outputData,
    {
      provDagId: 'dag_12345_security_query',
      model: 'claude-3.5-sonnet',
      cost: 0.0234,
    },
  );

  console.log(`  • Token length: ${signedResponse.token.length} chars`);
  console.log(`  • Self-verified: ${signedResponse.verified ? '✅' : '❌'}`);
  console.log(`  • Request ID: ${signedResponse.payload.requestId}`);
  console.log(
    `  • Input hash: ${signedResponse.payload.inputHash.substring(0, 16)}...`,
  );
  console.log(
    `  • Output hash: ${signedResponse.payload.outputHash.substring(0, 16)}...`,
  );

  // Generate JWKS
  console.log('\n🔑 Generating JWKS...');
  const jwks = await jwsService.generateJWKS();
  console.log(`  • Key ID: ${jwks.keys[0].kid}`);
  console.log(`  • Algorithm: ${jwks.keys[0].alg}`);
  console.log(`  • Curve: ${jwks.keys[0].crv}`);

  // Client verification
  console.log('\n🔍 Client verification...');
  const verifier = await JWSResponseService.createVerifier(
    jwks,
    jwks.keys[0].kid,
  );
  await verifier.initialize();

  const verification = await verifier.verifyResponse(
    signedResponse.token,
    inputData,
    outputData,
  );

  console.log(
    `  • Verification result: ${verification.valid ? '✅ VALID' : '❌ INVALID'}`,
  );
  if (verification.payload) {
    console.log(`  • Tenant: ${verification.payload.tenantId}`);
    console.log(`  • Timestamp: ${verification.payload.timestamp}`);
  }
  if (verification.error) {
    console.log(`  • Error: ${verification.error}`);
  }

  // Negative test (tampering)
  console.log('\n🚨 Tampering test...');
  const tamperedOutput = outputData + ' [TAMPERED]';
  const tamperedVerification = await verifier.verifyResponse(
    signedResponse.token,
    inputData,
    tamperedOutput,
  );

  console.log(
    `  • Tampered verification: ${tamperedVerification.valid ? '❌ FAILED TO DETECT' : '✅ DETECTED'}`,
  );
  console.log(`  • Error: ${tamperedVerification.error}`);

  return {
    token: signedResponse.token,
    jwks,
    verification,
  };
}

// Export for testing and integration
export { demonstrateJWS };
