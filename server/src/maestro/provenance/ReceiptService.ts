
import { createSign, createHash, generateKeyPairSync } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Receipt } from '../api-types.js';

// Mock Key Management Service
class KMS {
  private privateKey: string;
  private publicKey: string;
  public kid: string;

  constructor() {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.kid = 'dev-key-1';
  }

  sign(data: string): string {
    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

const kms = new KMS();

export class ReceiptService {
  private static instance: ReceiptService;

  private constructor() {}

  static getInstance(): ReceiptService {
    if (!ReceiptService.instance) {
      ReceiptService.instance = new ReceiptService();
    }
    return ReceiptService.instance;
  }

  generateReceipt(
    tenantId: string,
    action: string,
    actorId: string,
    resourceId: string,
    inputPayload: any,
    policyDecisionId?: string
  ): Receipt {
    const timestamp = new Date().toISOString();

    // Create digest of the event
    // Canonicalize input by stringifying
    const inputStr = JSON.stringify(inputPayload);
    const inputHash = createHash('sha256').update(inputStr).digest('hex');

    const receiptData = {
      tenantId,
      action,
      actorId,
      resourceId,
      inputHash,
      policyDecisionId,
      timestamp
    };

    const digest = createHash('sha256').update(JSON.stringify(receiptData)).digest('hex');
    const signature = kms.sign(digest);

    return {
      id: uuidv4(),
      timestamp,
      digest,
      signature,
      kid: kms.kid
    };
  }
}

export const receiptService = ReceiptService.getInstance();
