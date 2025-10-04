/**
 * WebAuthn Service
 *
 * Handles WebAuthn registration and authentication for step-up flows.
 */

const crypto = require('crypto');
const cbor = require('cbor');

class WebAuthnService {
  constructor() {
    this.rpName = process.env.WEBAUTHN_RP_NAME || 'IntelGraph Platform';
    this.rpId = process.env.WEBAUTHN_RP_ID || 'localhost';
    this.origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
    this.credentialStore = new Map(); // In production, use database
  }

  /**
   * Generate WebAuthn registration options
   */
  generateRegistrationOptions(userId, userName, userDisplayName) {
    const challenge = crypto.randomBytes(32);

    return {
      challenge: challenge.toString('base64url'),
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: userName,
        displayName: userDisplayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'required',
      },
    };
  }

  /**
   * Generate WebAuthn authentication options (for step-up)
   */
  generateAuthenticationOptions(userId) {
    const challenge = crypto.randomBytes(32);
    const credentials = this.getCredentialsForUser(userId);

    return {
      challenge: challenge.toString('base64url'),
      timeout: 60000,
      rpId: this.rpId,
      allowCredentials: credentials.map(cred => ({
        type: 'public-key',
        id: cred.credentialId,
      })),
      userVerification: 'required',
    };
  }

  /**
   * Verify WebAuthn assertion (used in step-up middleware)
   */
  verifyAssertion(credentialId, authenticatorData, clientDataJSON, signature) {
    try {
      // Decode authenticator data
      const authData = Buffer.from(authenticatorData, 'base64url');
      const clientData = Buffer.from(clientDataJSON, 'base64url');

      // Parse client data JSON
      const clientDataObj = JSON.parse(clientData.toString('utf-8'));

      // Verify origin
      if (clientDataObj.origin !== this.origin) {
        console.error('Origin mismatch:', clientDataObj.origin);
        return false;
      }

      // Verify type
      if (clientDataObj.type !== 'webauthn.get') {
        console.error('Invalid type:', clientDataObj.type);
        return false;
      }

      // Get stored credential
      const credential = this.credentialStore.get(credentialId);
      if (!credential) {
        console.error('Credential not found:', credentialId);
        return false;
      }

      // Verify signature
      const clientDataHash = crypto
        .createHash('sha256')
        .update(clientData)
        .digest();

      const signatureBase = Buffer.concat([authData, clientDataHash]);

      const verify = crypto.createVerify('SHA256');
      verify.update(signatureBase);

      const signatureBuffer = Buffer.from(signature, 'base64url');
      const publicKey = credential.publicKey;

      const verified = verify.verify(publicKey, signatureBuffer);

      return verified;

    } catch (error) {
      console.error('Assertion verification error:', error);
      return false;
    }
  }

  /**
   * Store credential (after successful registration)
   */
  storeCredential(userId, credentialId, publicKey, attestationData) {
    this.credentialStore.set(credentialId, {
      userId,
      credentialId,
      publicKey,
      attestationData,
      createdAt: Date.now(),
    });
  }

  /**
   * Get credentials for user
   */
  getCredentialsForUser(userId) {
    const credentials = [];
    for (const [credId, cred] of this.credentialStore.entries()) {
      if (cred.userId === userId) {
        credentials.push(cred);
      }
    }
    return credentials;
  }
}

module.exports = { WebAuthnService };
