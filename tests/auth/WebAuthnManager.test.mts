import {
  createSign,
  createHash,
  generateKeyPairSync,
  createPublicKey,
} from 'crypto';
import { WebAuthnManager } from '../../src/auth/webauthn/WebAuthnManager.js';

const config = {
  rpId: 'example.com',
  rpName: 'Example',
  origin: 'https://example.com',
  challengeTimeout: 5,
  sessionTimeout: 30,
  elevationTimeout: 10,
  enableRiskAssessment: false,
  allowPlatformAuthenticators: true,
  allowCrossPlatformAuthenticators: true,
  requireUserVerification: true,
  supportedAlgorithms: [-7],
  maxCredentialsPerUser: 5,
  attestationFormats: ['packed', 'none'],
};

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function buildPublicKeyPem(): { pem: string; privateKey: any } {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = createPublicKey({ key: publicKey.export({ format: 'pem', type: 'spki' }), format: 'pem' }).export({
    format: 'pem',
    type: 'spki',
  }) as string;

  return { pem, privateKey };
}

function buildAuthenticatorData(rpId: string, counter: number, options: { tamperRpId?: boolean } = {}): Buffer {
  const rpHash = createHash('sha256').update(options.tamperRpId ? `${rpId}-bad` : rpId).digest();
  const flags = 0x05; // User present + user verified
  const authData = Buffer.alloc(37);
  rpHash.copy(authData, 0);
  authData[32] = flags;
  authData.writeUInt32BE(counter, 33);
  return authData;
}

function signAssertion(privateKey: any, authenticatorData: Buffer, clientDataJSON: Buffer): Buffer {
  const clientDataHash = createHash('sha256').update(clientDataJSON).digest();
  const signatureBase = Buffer.concat([authenticatorData, clientDataHash]);
  const signer = createSign('SHA256');
  signer.update(signatureBase);
  signer.end();
  return signer.sign(privateKey);
}

describe('WebAuthnManager authentication validation', () => {
  it('rejects tampered signatures and RP hash mismatches', async () => {
    const manager = new WebAuthnManager(config as any);
    const { pem, privateKey } = buildPublicKeyPem();
    const credentialId = Buffer.from('cred-1');
    const challenge = await manager.initiateAuthentication({
      userId: 'user-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    const authenticatorData = buildAuthenticatorData(config.rpId, 1);
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: 'webauthn.get',
        challenge: Buffer.from(challenge.options.challenge).toString('base64'),
        origin: config.origin,
      }),
    );

    const signature = signAssertion(privateKey, authenticatorData, clientDataJSON);

    (manager as any).credentials.set('user-1', [
      {
        id: 'stored-1',
        userId: 'user-1',
        credentialId: bufferToArrayBuffer(credentialId),
        publicKey: bufferToArrayBuffer(Buffer.from(pem)),
        algorithm: -7,
        counter: 0,
        aaguid: bufferToArrayBuffer(Buffer.alloc(16)),
        credentialBackedUp: true,
        credentialDeviceType: 'multiDevice',
        transports: [],
        attestationFormat: 'packed',
        createdAt: new Date(),
        metadata: { userAgent: 'jest', ipAddress: '127.0.0.1' },
      },
    ]);

    const successful = await manager.completeAuthentication(
      challenge.challengeId,
      {
        id: 'cred-1',
        rawId: bufferToArrayBuffer(credentialId),
        response: {
          clientDataJSON: bufferToArrayBuffer(clientDataJSON),
          authenticatorData: bufferToArrayBuffer(authenticatorData),
          signature: bufferToArrayBuffer(signature),
        } as any,
        type: 'public-key',
        getClientExtensionResults: () => ({}),
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(successful.success).toBe(true);

    const tamperedSig = Buffer.from(signature);
    tamperedSig[0] = tamperedSig[0] ^ 0xff;

    const badSignatureResult = await manager.completeAuthentication(
      challenge.challengeId,
      {
        id: 'cred-1',
        rawId: bufferToArrayBuffer(credentialId),
        response: {
          clientDataJSON: bufferToArrayBuffer(clientDataJSON),
          authenticatorData: bufferToArrayBuffer(authenticatorData),
          signature: bufferToArrayBuffer(tamperedSig),
        } as any,
        type: 'public-key',
        getClientExtensionResults: () => ({}),
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(badSignatureResult.success).toBe(false);
    expect(badSignatureResult.errors).toContain('Invalid signature');

    const badAuthData = buildAuthenticatorData(config.rpId, 2, { tamperRpId: true });
    const badAuthResult = await manager.completeAuthentication(
      challenge.challengeId,
      {
        id: 'cred-1',
        rawId: bufferToArrayBuffer(credentialId),
        response: {
          clientDataJSON: bufferToArrayBuffer(clientDataJSON),
          authenticatorData: bufferToArrayBuffer(badAuthData),
          signature: bufferToArrayBuffer(signAssertion(privateKey, badAuthData, clientDataJSON)),
        } as any,
        type: 'public-key',
        getClientExtensionResults: () => ({}),
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(badAuthResult.success).toBe(false);
    expect(badAuthResult.errors).toContain('RP ID hash mismatch');
  });
});
