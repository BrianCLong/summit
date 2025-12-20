import bs58 from 'bs58';
import { verify } from '@noble/ed25519';
import { DidDocument, DidResolver } from './types.js';

// Multicodec prefix for Ed25519 public key
const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

export class InMemoryDidResolver implements DidResolver {
  private readonly docs = new Map<string, DidDocument>();

  constructor(initialDocs: DidDocument[] = []) {
    initialDocs.forEach((doc) => this.docs.set(doc.id, doc));
  }

  register(doc: DidDocument): void {
    this.docs.set(doc.id, doc);
  }

  async resolve(did: string): Promise<DidDocument> {
    if (did.startsWith('did:key:')) {
      return deriveDidKeyDocument(did);
    }

    const doc = this.docs.get(did);
    if (!doc) {
      throw new Error(`DID document not found for ${did}`);
    }

    return doc;
  }
}

export function deriveDidKeyDocument(did: string): DidDocument {
  const fragment = `${did}#keys-1`;
  const publicKeyMultibase = did.replace('did:key:', '');
  return {
    id: did,
    assertionMethod: [fragment],
    verificationMethod: [
      {
        id: fragment,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase,
      },
    ],
  };
}

export function publicKeyFromMultibase(multibaseKey: string): Uint8Array {
  if (!multibaseKey.startsWith('z')) {
    throw new Error('Only base58-btc multibase keys are supported');
  }
  const decoded = bs58.decode(multibaseKey.slice(1));
  if (decoded.length !== 34) {
    throw new Error('Unsupported key length for did:key');
  }
  const keyBytes = decoded.slice(2);
  if (
    decoded[0] !== ED25519_PREFIX[0] ||
    decoded[1] !== ED25519_PREFIX[1]
  ) {
    throw new Error('Unsupported multicodec prefix for did:key');
  }
  return keyBytes;
}

export async function verifyEd25519Signature(
  publicKey: Uint8Array,
  data: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  return verify(signature, data, publicKey);
}
