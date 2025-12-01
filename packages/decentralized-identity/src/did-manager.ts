/**
 * DID Manager - Create, resolve, and manage Decentralized Identifiers
 */

import crypto from 'crypto';
import type { DIDDocument, VerificationMethod, ServiceEndpoint } from './types.js';

export class DIDManager {
  private documents: Map<string, DIDDocument> = new Map();

  async createDID(
    method: 'key' | 'web' | 'ion' = 'key',
    options?: { controller?: string; services?: ServiceEndpoint[] },
  ): Promise<{ did: string; document: DIDDocument; privateKey: string }> {
    const keyPair = await this.generateKeyPair();
    const did = this.generateDID(method, keyPair.publicKey);

    const document: DIDDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: did,
      controller: options?.controller,
      verificationMethod: [
        {
          id: `${did}#key-1`,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyJwk: {
            kty: 'EC',
            crv: 'P-256',
            x: keyPair.publicKey.substring(0, 43),
            y: keyPair.publicKey.substring(43),
          },
        },
      ],
      authentication: [`${did}#key-1`],
      assertionMethod: [`${did}#key-1`],
      service: options?.services,
    };

    this.documents.set(did, document);

    return {
      did,
      document,
      privateKey: keyPair.privateKey,
    };
  }

  async resolveDID(did: string): Promise<DIDDocument | undefined> {
    // Check local cache
    const cached = this.documents.get(did);
    if (cached) return cached;

    // In production, resolve via DID resolver network
    return undefined;
  }

  async updateDID(
    did: string,
    updates: Partial<Omit<DIDDocument, 'id'>>,
  ): Promise<DIDDocument | undefined> {
    const document = this.documents.get(did);
    if (!document) return undefined;

    const updated: DIDDocument = {
      ...document,
      ...updates,
      id: did, // Ensure ID isn't changed
    };

    this.documents.set(did, updated);
    return updated;
  }

  async addVerificationMethod(
    did: string,
    method: VerificationMethod,
  ): Promise<DIDDocument | undefined> {
    const document = this.documents.get(did);
    if (!document) return undefined;

    document.verificationMethod.push(method);
    return document;
  }

  async addService(
    did: string,
    service: ServiceEndpoint,
  ): Promise<DIDDocument | undefined> {
    const document = this.documents.get(did);
    if (!document) return undefined;

    document.service = document.service || [];
    document.service.push(service);
    return document;
  }

  async deactivateDID(did: string): Promise<boolean> {
    return this.documents.delete(did);
  }

  private async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });

    return {
      publicKey: publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64url'),
      privateKey: privateKey
        .export({ type: 'pkcs8', format: 'der' })
        .toString('base64url'),
    };
  }

  private generateDID(method: string, publicKey: string): string {
    const fingerprint = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('base64url')
      .substring(0, 32);

    switch (method) {
      case 'key':
        return `did:key:z${fingerprint}`;
      case 'web':
        return `did:web:intelgraph.io:users:${fingerprint}`;
      case 'ion':
        return `did:ion:${fingerprint}`;
      default:
        return `did:key:z${fingerprint}`;
    }
  }
}
