// src/context/capsules/crypto.ts
// Cryptographic utilities for IC³ system

import { ContextCapsule, Invariant } from './types';
import * as crypto from 'crypto';

// Using Web Crypto API for browser compatibility, with Node fallback
const getWebCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  } else if (typeof crypto !== 'undefined') {
    // Node.js crypto module
    return crypto as any;
  } else {
    throw new Error('No cryptographic API available');
  }
};

/**
 * Generates a cryptographic hash of the content
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  if (typeof window !== 'undefined') {
    // Browser environment
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Creates a cryptographic signature for a context capsule
 */
export async function signCapsule(capsule: Omit<ContextCapsule, 'signature'>): Promise<string> {
  // Create a canonical representation of the capsule content (excluding signature)
  const canonicalStr = JSON.stringify({
    id: capsule.id,
    content: capsule.content,
    invariants: capsule.invariants.map(inv => ({
      id: inv.id,
      type: inv.type,
      specification: inv.specification,
      authority: inv.authority,
      createdAt: inv.createdAt.getTime()
    })),
    metadata: capsule.metadata,
    timestamp: capsule.timestamp.getTime(),
    version: capsule.version
  });
  
  return await hashContent(canonicalStr);
}

/**
 * Verifies that the signature matches the capsule content
 */
export async function verifyCapsuleSignature(capsule: ContextCapsule): Promise<boolean> {
  // Recreate the canonical representation
  const canonicalStr = JSON.stringify({
    id: capsule.id,
    content: capsule.content,
    invariants: capsule.invariants.map(inv => ({
      id: inv.id,
      type: inv.type,
      specification: inv.specification,
      authority: inv.authority,
      createdAt: inv.createdAt.getTime()
    })),
    metadata: capsule.metadata,
    timestamp: capsule.timestamp.getTime(),
    version: capsule.version
  });
  
  const expectedSignature = await hashContent(canonicalStr);
  return expectedSignature === capsule.signature;
}

/**
 * Creates a cryptographic signature for an invariant
 */
export async function signInvariant(content: string, invariant: Omit<Invariant, 'signature'>): Promise<string> {
  // Create a canonical representation of the combined content and invariant
  const canonicalStr = JSON.stringify({
    contentHash: await hashContent(content),
    invariant: {
      id: invariant.id,
      type: invariant.type,
      specification: invariant.specification,
      authority: invariant.authority,
      createdAt: invariant.createdAt.getTime()
    }
  });
  
  return await hashContent(canonicalStr);
}

/**
 * Verifies that an invariant signature matches the content and invariant
 */
export async function verifyInvariantSignature(content: string, invariant: Invariant): Promise<boolean> {
  // Recreate the canonical representation
  const canonicalStr = JSON.stringify({
    contentHash: await hashContent(content),
    invariant: {
      id: invariant.id,
      type: invariant.type,
      specification: invariant.specification,
      authority: invariant.authority,
      createdAt: invariant.createdAt.getTime()
    }
  });
  
  const expectedSignature = await hashContent(canonicalStr);
  return expectedSignature === invariant.signature;
}

/**
 * Generates a unique ID for a capsule
 */
export function generateCapsuleId(): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    return crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Generates a unique ID for an invariant
 */
export function generateInvariantId(): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return 'inv_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    return 'inv_' + crypto.randomBytes(8).toString('hex');
  }
}